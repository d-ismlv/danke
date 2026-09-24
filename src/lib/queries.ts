import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { decks, topics, cards, reviewState, reviewLogs } from "@/db/schema";
import type { Card, Deck, Topic } from "@/db/schema";
import { toList, type List } from "@/lib/parse";
import { requireSession } from "@/lib/auth";
import {
  learningStatusForScope,
  MATURE_DAYS,
  type LearningStatus,
  type MemoryState,
} from "@/lib/status";

const DAY_MS = 86_400_000;
/** The window every recall figure and every "recently" judgement reads. */
const RECENT_DAYS = 30;

/* Every exported read below starts with `requireSession()`. The proxy turns
   anonymous traffic away first, but the root layout renders a page's content
   whether or not anyone is signed in, so without this a page was one proxy
   bug — or one matcher edit — from serving the whole library to a stranger.
   Mutations were already held to this; reads are now held to it too. */

/** Read the clock outside render, which React's purity lint requires. */
export function now(): number {
  return Date.now();
}

/* ==========================================================================
   Counts

   Every screen asks the same questions of a collection — how many cards, how
   many are due, how much of it is holding, and how is it actually going — so
   they are answered once, in one shape, and rolled up from topic to deck to
   library. "Learned" means FSRS has graduated the card out of learning
   (state 2); it is the single definition behind every percentage in the app.
   ========================================================================== */

export type Counts = {
  cards: number;
  /** Studied cards whose next review has come round. A card never studied is
   * not due — it has no debt to pay yet — and is counted in `memory.unseen`. */
  due: number;
  learned: number;
  /** 0-100. Zero cards reads as 0%, not as a hole in the layout. */
  percent: number;
  /** Epoch ms of the most recent review here, or null. */
  lastStudied: number | null;
  memory: Record<MemoryState, number>;
  /** Cards answered at least once, and those the scheduler is not holding. */
  reviewed: number;
  unstable: number;
  /** Answers in the trailing window, and how many of them were Again. */
  recentTotal: number;
  recentAgain: number;
  /** Share of those answers that were not Again. Null until something is graded. */
  recall: number | null;
  status: LearningStatus;
};

function empty(): Counts {
  return {
    cards: 0,
    due: 0,
    learned: 0,
    percent: 0,
    lastStudied: null,
    memory: { mature: 0, young: 0, learning: 0, unseen: 0 },
    reviewed: 0,
    unstable: 0,
    recentTotal: 0,
    recentAgain: 0,
    recall: null,
    status: "new",
  };
}

function add(into: Counts, from: Counts): void {
  into.cards += from.cards;
  into.due += from.due;
  into.learned += from.learned;
  into.reviewed += from.reviewed;
  into.unstable += from.unstable;
  into.recentTotal += from.recentTotal;
  into.recentAgain += from.recentAgain;
  for (const key of ["mature", "young", "learning", "unseen"] as const) {
    into.memory[key] += from.memory[key];
  }
  into.lastStudied = Math.max(into.lastStudied ?? 0, from.lastStudied ?? 0) || null;
}

/** Derive everything that is a function of the sums, once the sums are final. */
function sealed(c: Counts): Counts {
  c.percent = c.cards === 0 ? 0 : Math.round((c.learned / c.cards) * 100);
  c.recall =
    c.recentTotal === 0
      ? null
      : Math.round(((c.recentTotal - c.recentAgain) / c.recentTotal) * 100);
  c.status = learningStatusForScope({
    cards: c.cards,
    reviewed: c.reviewed,
    unstable: c.unstable,
    mature: c.memory.mature,
    recentTotal: c.recentTotal,
    recentAgain: c.recentAgain,
  });
  return c;
}

type TopicRow = {
  topicId: string;
  topicName: string;
  deckId: string;
  deckName: string;
  cards: number;
  due: number;
  learned: number;
  mature: number;
  young: number;
  learningCards: number;
  unseen: number;
  reviewed: number;
  unstable: number;
  lastStudied: number | null;
};

function toCounts(row: Partial<TopicRow> & { recentTotal?: number; recentAgain?: number }): Counts {
  const c = empty();
  c.cards = row.cards ?? 0;
  c.due = row.due ?? 0;
  c.learned = row.learned ?? 0;
  c.lastStudied = row.lastStudied ?? null;
  c.memory = {
    mature: row.mature ?? 0,
    young: row.young ?? 0,
    learning: row.learningCards ?? 0,
    unseen: row.unseen ?? 0,
  };
  c.reviewed = row.reviewed ?? 0;
  c.unstable = row.unstable ?? 0;
  c.recentTotal = row.recentTotal ?? 0;
  c.recentAgain = row.recentAgain ?? 0;
  return c;
}

/**
 * One row per topic, counts included — the whole library in a single query.
 *
 * A card with no schedule row at all counts as unseen, which is why the
 * `unseen` bucket tests for a null state rather than for state 0 alone. An
 * unseen card is never also due, although its `due` is the moment it was
 * imported: counting it would have every fresh import read as a backlog, and
 * say "10 due" beside ten marks that each say Unseen.
 * "Unstable" is the scheduler saying it is not holding this card: relearning
 * now, or lapsed more than once and still on a short interval.
 */
async function topicRows(at: number): Promise<TopicRow[]> {
  return db.all<TopicRow>(sql`
    SELECT
      ${topics.id}   AS topicId,
      ${topics.name} AS topicName,
      ${decks.id}    AS deckId,
      ${decks.name}  AS deckName,
      COUNT(${cards.id}) AS cards,
      COALESCE(SUM(CASE WHEN ${reviewState.state} <> 0 AND ${reviewState.due} <= ${at} THEN 1 ELSE 0 END), 0) AS due,
      COALESCE(SUM(CASE WHEN ${reviewState.state} = 2 THEN 1 ELSE 0 END), 0) AS learned,
      COALESCE(SUM(CASE WHEN ${reviewState.state} = 2 AND ${reviewState.stability} >= ${MATURE_DAYS} THEN 1 ELSE 0 END), 0) AS mature,
      COALESCE(SUM(CASE WHEN ${reviewState.state} = 2 AND ${reviewState.stability} < ${MATURE_DAYS} THEN 1 ELSE 0 END), 0) AS young,
      COALESCE(SUM(CASE WHEN ${reviewState.state} IN (1, 3) THEN 1 ELSE 0 END), 0) AS learningCards,
      COALESCE(SUM(CASE WHEN ${reviewState.state} IS NULL OR ${reviewState.state} = 0 THEN 1 ELSE 0 END), 0) AS unseen,
      COALESCE(SUM(CASE WHEN ${reviewState.state} IS NOT NULL AND ${reviewState.state} <> 0 THEN 1 ELSE 0 END), 0) AS reviewed,
      COALESCE(SUM(CASE WHEN ${reviewState.state} = 3
        OR (${reviewState.lapses} >= 2 AND ${reviewState.stability} < ${MATURE_DAYS} AND ${reviewState.state} <> 0)
        THEN 1 ELSE 0 END), 0) AS unstable,
      MAX(${reviewState.lastReview}) AS lastStudied
    FROM ${topics}
    JOIN ${decks} ON ${decks.id} = ${topics.deckId}
    LEFT JOIN ${cards} ON ${cards.topicId} = ${topics.id}
    LEFT JOIN ${reviewState} ON ${reviewState.cardId} = ${cards.id}
    GROUP BY ${topics.id}
    ORDER BY ${decks.name} COLLATE NOCASE, ${topics.name} COLLATE NOCASE
  `);
}

type RecentRow = { topicId: string; total: number; again: number };

/**
 * The trailing window's answers, per topic.
 *
 * Its own query rather than another join on the one above: `review_logs` is
 * the table that grows without bound, and joining it into a per-card
 * aggregate multiplies every other count by the number of times that card has
 * been answered.
 */
async function recentRows(at: number): Promise<Map<string, RecentRow>> {
  const rows = await db.all<RecentRow>(sql`
    SELECT
      ${cards.topicId} AS topicId,
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN ${reviewLogs.rating} = 1 THEN 1 ELSE 0 END), 0) AS again
    FROM ${reviewLogs}
    JOIN ${cards} ON ${cards.id} = ${reviewLogs.cardId}
    WHERE ${reviewLogs.reviewedAt} >= ${at - RECENT_DAYS * DAY_MS}
    GROUP BY ${cards.topicId}
  `);
  return new Map(rows.map((r) => [r.topicId, r]));
}

/** Topic rows and their recent answers, merged into finished Counts. */
async function scopedCounts(at: number): Promise<{ row: TopicRow; counts: Counts }[]> {
  const [rows, recent] = await Promise.all([topicRows(at), recentRows(at)]);
  return rows.map((row) => {
    const seen = recent.get(row.topicId);
    return {
      row,
      counts: sealed(
        toCounts({ ...row, recentTotal: seen?.total ?? 0, recentAgain: seen?.again ?? 0 }),
      ),
    };
  });
}

export type TopicSummary = Topic & { counts: Counts };
export type DeckSummary = Deck & { counts: Counts; topicCount: number };

/** Every deck with its rolled-up counts, alphabetical. The library list. */
export async function getLibrary(at = Date.now()): Promise<{
  decks: DeckSummary[];
  totals: Counts;
}> {
  await requireSession();
  const [all, scoped] = await Promise.all([
    db.select().from(decks).orderBy(asc(sql`${decks.name} COLLATE NOCASE`)),
    scopedCounts(at),
  ]);

  const byDeck = new Map<string, { counts: Counts; topicCount: number }>();
  for (const deck of all) byDeck.set(deck.id, { counts: empty(), topicCount: 0 });

  const totals = empty();
  for (const { row, counts } of scoped) {
    const entry = byDeck.get(row.deckId);
    if (!entry) continue;
    entry.topicCount += 1;
    add(entry.counts, counts);
    add(totals, counts);
  }

  return {
    decks: all.map((deck) => {
      const entry = byDeck.get(deck.id)!;
      return { ...deck, counts: sealed(entry.counts), topicCount: entry.topicCount };
    }),
    totals: sealed(totals),
  };
}

/** One mark per card, keyed by topic — the fragmented state row on a deck. */
export type CardState = { state: number | null; stability: number | null; due: number | null };

async function cardStatesByTopic(deckId: string): Promise<Map<string, CardState[]>> {
  const rows = await db
    .select({
      topicId: cards.topicId,
      state: reviewState.state,
      stability: reviewState.stability,
      due: reviewState.due,
    })
    .from(cards)
    .innerJoin(topics, eq(topics.id, cards.topicId))
    .leftJoin(reviewState, eq(reviewState.cardId, cards.id))
    .where(eq(topics.deckId, deckId))
    .orderBy(asc(cards.position), asc(cards.createdAt));

  const out = new Map<string, CardState[]>();
  for (const row of rows) {
    const list = out.get(row.topicId) ?? [];
    list.push({ state: row.state, stability: row.stability, due: row.due });
    out.set(row.topicId, list);
  }
  return out;
}

/** One deck, its topics, the counts for both, and each topic's card states. */
export async function getDeckView(
  deckId: string,
  at = Date.now(),
): Promise<{ deck: Deck; topics: TopicSummary[]; marks: Map<string, CardState[]>; counts: Counts } | null> {
  await requireSession();
  const [deck] = await db.select().from(decks).where(eq(decks.id, deckId)).limit(1);
  if (!deck) return null;

  const [scoped, all, marks] = await Promise.all([
    scopedCounts(at),
    db
      .select()
      .from(topics)
      .where(eq(topics.deckId, deckId))
      .orderBy(asc(sql`${topics.name} COLLATE NOCASE`)),
    cardStatesByTopic(deckId),
  ]);

  const counted = new Map(scoped.map((s) => [s.row.topicId, s.counts]));
  const counts = empty();
  const summaries = all.map((topic) => {
    const own = counted.get(topic.id) ?? sealed(empty());
    add(counts, own);
    return { ...topic, counts: own };
  });

  return { deck, topics: summaries, marks, counts: sealed(counts) };
}

export type CardRow = Card & CardState;

/** One topic, its deck, and every card in it — the topic screen. */
export async function getTopicView(
  topicId: string,
  at = Date.now(),
): Promise<{ topic: Topic; deck: Deck; cards: CardRow[]; counts: Counts } | null> {
  await requireSession();
  const [found] = await db
    .select({ topic: topics, deck: decks })
    .from(topics)
    .innerJoin(decks, eq(decks.id, topics.deckId))
    .where(eq(topics.id, topicId))
    .limit(1);
  if (!found) return null;

  const [rows, scoped] = await Promise.all([
    db
      .select({
        id: cards.id,
        topicId: cards.topicId,
        title: cards.title,
        points: cards.points,
        position: cards.position,
        createdAt: cards.createdAt,
        updatedAt: cards.updatedAt,
        state: reviewState.state,
        stability: reviewState.stability,
        due: reviewState.due,
      })
      .from(cards)
      .leftJoin(reviewState, eq(reviewState.cardId, cards.id))
      .where(eq(cards.topicId, topicId))
      .orderBy(asc(cards.position), asc(cards.createdAt)),
    scopedCounts(at),
  ]);

  const counts = scoped.find((s) => s.row.topicId === topicId)?.counts ?? sealed(empty());
  /* Drizzle hands back whatever the JSON column holds, which for a card last
     written before points could nest is a flat array of strings. */
  const read = rows.map((row) => ({ ...row, points: toList(row.points) }));
  return { topic: found.topic, deck: found.deck, cards: read, counts };
}

/* ==========================================================================
   Days

   A streak, "today" and the activity grid all count calendar days, and a
   calendar day is local: one that turned over at UTC midnight broke a streak
   at 02:00 in Stockholm and at 17:00 in California, and counted an evening's
   study as tomorrow's. Local is the server's zone — `TZ`, or UTC when it is
   unset — because that is the only clock a self-hosted app has.
   ========================================================================== */

/** A quarter of an hour. Every UTC offset in use is a whole number of them. */
const SLOT_MS = 15 * 60_000;

/**
 * The local calendar day `ms` falls on, numbered like `Math.floor(ms /
 * DAY_MS)` — days since 1970-01-01 — but starting at local midnight. So a day
 * number read back through UTC (`new Date(day * DAY_MS)`) is that date.
 */
function localDay(ms: number): number {
  return Math.floor((ms - new Date(ms).getTimezoneOffset() * 60_000) / DAY_MS);
}

/**
 * Answers per local day, over the trailing `days` days including today.
 *
 * SQLite counts them into quarter-hour slots and this folds the slots into
 * days: no slot straddles a local midnight, so nothing is split, and the
 * folding happens where the time zone is known. SQLite's own `localtime`
 * reads the system zone database, which the slim image does not ship — Node
 * carries its own. The CAST is not decoration: a bound parameter arrives as
 * REAL, so the division would be float and every row its own slot.
 */
async function answersByDay(at: number, days: number): Promise<Map<number, number>> {
  const today = localDay(at);
  const rows = await db.all<{ slot: number; n: number }>(sql`
    SELECT CAST(${reviewLogs.reviewedAt} / ${SLOT_MS} AS INTEGER) AS slot, COUNT(*) AS n
    FROM ${reviewLogs}
    WHERE ${reviewLogs.reviewedAt} >= ${(today - days) * DAY_MS}
    GROUP BY slot
  `);
  const byDay = new Map<number, number>();
  for (const { slot, n } of rows) {
    const day = localDay(slot * SLOT_MS);
    if (day > today - days) byDay.set(day, (byDay.get(day) ?? 0) + n);
  }
  return byDay;
}

/** Consecutive days with at least one answer, counting back from today — or
 * from yesterday, so a day you have not started yet does not read as a break. */
function streakOf(byDay: Map<number, number>, today: number): number {
  let streak = 0;
  for (let day = byDay.has(today) ? today : today - 1; byDay.has(day); day--) streak += 1;
  return streak;
}

/**
 * The streak on its own. The library wants this one number and none of the
 * rest of the Progress page's work, so it does not go through `getProgress`.
 */
export async function getStreak(at = Date.now()): Promise<number> {
  await requireSession();
  return streakOf(await answersByDay(at, 365), localDay(at));
}

/**
 * Just enough to title a page and label a session.
 *
 * `generateMetadata` runs before the body and used to call the full view
 * loader, which meant the whole per-topic aggregate ran twice per navigation —
 * once for a string. It is also the only place a missing record can be caught
 * before the response starts streaming, which is what makes the 404 a 404
 * rather than a 200 with the not-found page inside it.
 */
export async function getDeckLabel(
  deckId: string,
): Promise<{ name: string; topicCount: number } | null> {
  await requireSession();
  const [row] = await db.all<{ name: string; topicCount: number }>(sql`
    SELECT ${decks.name} AS name, COUNT(${topics.id}) AS topicCount
    FROM ${decks} LEFT JOIN ${topics} ON ${topics.deckId} = ${decks.id}
    WHERE ${decks.id} = ${deckId}
    GROUP BY ${decks.id}
  `);
  return row ?? null;
}

export async function getTopicLabel(
  topicId: string,
): Promise<{ name: string; deckName: string; deckId: string } | null> {
  await requireSession();
  const [row] = await db
    .select({ name: topics.name, deckName: decks.name, deckId: decks.id })
    .from(topics)
    .innerJoin(decks, eq(decks.id, topics.deckId))
    .where(eq(topics.id, topicId))
    .limit(1);
  return row ?? null;
}

/** Decks and their topics, for the import screen's two pickers. */
export async function getDeckOptions(): Promise<
  { id: string; name: string; topics: { id: string; name: string }[] }[]
> {
  await requireSession();
  const [allDecks, allTopics] = await Promise.all([
    db.select().from(decks).orderBy(asc(sql`${decks.name} COLLATE NOCASE`)),
    db.select().from(topics).orderBy(asc(sql`${topics.name} COLLATE NOCASE`)),
  ]);
  return allDecks.map((deck) => ({
    id: deck.id,
    name: deck.name,
    topics: allTopics
      .filter((t) => t.deckId === deck.id)
      .map((t) => ({ id: t.id, name: t.name })),
  }));
}

/* ==========================================================================
   The study queue
   ========================================================================== */

export type QueueCard = {
  id: string;
  title: string;
  points: List;
};

export type Scope =
  | { kind: "library" }
  | { kind: "deck"; id: string }
  | { kind: "topic"; id: string };

/** A session's worth of cards. Long enough to clear a real backlog, short
 * enough that the end of it is a place to stop. */
export const SESSION_LIMIT = 120;

/**
 * What to study, in the order to study it.
 *
 * One rule, whatever the scope: cards that are **due** come first, oldest debt
 * first; then cards you have **never seen**; then the rest of the selection,
 * nearest to due first. An unseen card's `due` is the moment it was imported,
 * which is always in the past, so it is banded by its state before its date —
 * otherwise last month's import sorts ahead of today's reviews, and a big
 * enough one pushes them out of the session altogether. There is no separate
 * practice mode to choose — a
 * session simply runs out of due cards and carries on into new ones, and every
 * answer is graded the same way.
 *
 * Within each of those bands the cards are dealt out one topic at a time, so
 * studying a whole deck moves across its topics instead of spending its first
 * twenty cards inside one of them. That is all the randomisation there is: the
 * order varies, but never in a way that shows you the same thing twice.
 */
export async function buildQueue(
  scope: Scope,
  at = Date.now(),
): Promise<{ cards: QueueCard[]; total: number }> {
  await requireSession();
  const where =
    scope.kind === "topic"
      ? sql`WHERE ${topics.id} = ${scope.id}`
      : scope.kind === "deck"
        ? sql`WHERE ${topics.deckId} = ${scope.id}`
        : sql``;

  const rows = await db.all<{
    id: string;
    title: string;
    points: string;
    topicId: string;
    band: number;
  }>(sql`
    SELECT
      ${cards.id} AS id,
      ${cards.title} AS title,
      ${cards.points} AS points,
      ${topics.id} AS topicId,
      CASE
        WHEN ${reviewState.state} = 0 THEN 1
        WHEN ${reviewState.due} <= ${at} THEN 0
        ELSE 2
      END AS band
    FROM ${cards}
    JOIN ${topics} ON ${topics.id} = ${cards.topicId}
    JOIN ${reviewState} ON ${reviewState.cardId} = ${cards.id}
    ${where}
    ORDER BY band, ${reviewState.due}, ${cards.position}
  `);

  const bands: QueueCard[][] = [[], [], []];
  for (const row of rows) {
    bands[row.band].push({ id: row.id, title: row.title, points: toList(row.points) });
  }

  const queue =
    scope.kind === "topic"
      ? [...bands[0], shuffle(bands[1]), bands[2]].flat()
      : [
          spread(bands[0], rows),
          spread(shuffle(bands[1]), rows),
          spread(bands[2], rows),
        ].flat();

  return { cards: queue.slice(0, SESSION_LIMIT), total: rows.length };
}

/** Deal the band out one topic at a time, keeping each topic's own order. */
function spread(band: QueueCard[], rows: { id: string; topicId: string }[]): QueueCard[] {
  const topicOf = new Map(rows.map((r) => [r.id, r.topicId]));
  const lanes = new Map<string, QueueCard[]>();
  for (const card of band) {
    const key = topicOf.get(card.id) ?? "";
    (lanes.get(key) ?? lanes.set(key, []).get(key)!).push(card);
  }
  const out: QueueCard[] = [];
  const queues = [...lanes.values()];
  for (let i = 0; out.length < band.length; i++) {
    for (const lane of queues) {
      if (i < lane.length) out.push(lane[i]);
    }
  }
  return out;
}

/** Fisher-Yates, in place. Unseen cards have no due date to sort by, so their
 * order is arbitrary — better arbitrary than always the same. */
function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/* ==========================================================================
   Progress
   ========================================================================== */

export type Progress = {
  totalCards: number;
  /** The four states a card can be in, which sum to `totalCards`. */
  memory: Record<MemoryState, number>;
  percent: number;
  streak: number;
  reviewsToday: number;
  recall: number | null;
  /** Local day number (see `localDay`) -> answers, for the past year. */
  heatmap: Record<number, number>;
  today: number;
  decks: DeckSummary[];
};

export async function getProgress(at = Date.now()): Promise<Progress> {
  await requireSession();
  const today = localDay(at);
  const [{ decks: deckSummaries, totals }, byDay] = await Promise.all([
    getLibrary(at),
    answersByDay(at, 365),
  ]);

  return {
    totalCards: totals.cards,
    memory: totals.memory,
    percent: totals.percent,
    streak: streakOf(byDay, today),
    reviewsToday: byDay.get(today) ?? 0,
    recall: totals.recall,
    heatmap: Object.fromEntries(byDay),
    today,
    // Weakest first — the page's answer to "what should I work on".
    decks: deckSummaries
      .filter((deck) => deck.counts.cards > 0)
      .sort(
        (a, b) =>
          (a.counts.recall ?? 101) - (b.counts.recall ?? 101) ||
          a.name.localeCompare(b.name),
      ),
  };
}
