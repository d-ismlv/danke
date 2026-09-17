import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { decks, topics, cards, reviewState, reviewLogs } from "@/db/schema";
import type { Card, Deck, ReviewStateRow, Topic } from "@/db/schema";

const DAY_MS = 86_400_000;
/** A card whose memory has held this long is counted as learned for good. */
const MATURE_DAYS = 21;

/** Read the clock outside render, which React's purity lint requires. */
export function now(): number {
  return Date.now();
}

/* ==========================================================================
   Counts

   Every screen asks the same three questions of a collection — how many cards,
   how many are due, how much of it is holding — so they are answered once,
   in one shape, and rolled up from topic to deck to library. "Learned" means
   FSRS has graduated the card out of learning (state 2); it is the single
   definition behind every percentage and progress bar in the app.
   ========================================================================== */

export type Counts = {
  cards: number;
  due: number;
  learned: number;
  /** 0-100. Zero cards reads as 0%, not as a hole in the layout. */
  percent: number;
  /** Epoch ms of the most recent review here, or null. */
  lastStudied: number | null;
};

function empty(): Counts {
  return { cards: 0, due: 0, learned: 0, percent: 0, lastStudied: null };
}

function add(into: Counts, from: Counts): void {
  into.cards += from.cards;
  into.due += from.due;
  into.learned += from.learned;
  into.lastStudied = Math.max(into.lastStudied ?? 0, from.lastStudied ?? 0) || null;
}

function sealed(c: Counts): Counts {
  c.percent = c.cards === 0 ? 0 : Math.round((c.learned / c.cards) * 100);
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
  lastStudied: number | null;
};

/**
 * One row per topic, counts included — the whole library in a single query.
 * The old home page joined every card to its schedule to count them, on the
 * screen that is also the app's front door.
 */
async function topicRows(at: number): Promise<TopicRow[]> {
  return db.all<TopicRow>(sql`
    SELECT
      ${topics.id}   AS topicId,
      ${topics.name} AS topicName,
      ${decks.id}    AS deckId,
      ${decks.name}  AS deckName,
      COUNT(${cards.id}) AS cards,
      COALESCE(SUM(CASE WHEN ${reviewState.due} <= ${at} THEN 1 ELSE 0 END), 0) AS due,
      COALESCE(SUM(CASE WHEN ${reviewState.state} = 2 THEN 1 ELSE 0 END), 0) AS learned,
      MAX(${reviewState.lastReview}) AS lastStudied
    FROM ${topics}
    JOIN ${decks} ON ${decks.id} = ${topics.deckId}
    LEFT JOIN ${cards} ON ${cards.topicId} = ${topics.id}
    LEFT JOIN ${reviewState} ON ${reviewState.cardId} = ${cards.id}
    GROUP BY ${topics.id}
    ORDER BY ${decks.name} COLLATE NOCASE, ${topics.name} COLLATE NOCASE
  `);
}

export type TopicSummary = Topic & { counts: Counts };
export type DeckSummary = Deck & { counts: Counts; topicCount: number };

/** Every deck with its rolled-up counts, alphabetical. The home grid. */
export async function getLibrary(at = Date.now()): Promise<{
  decks: DeckSummary[];
  totals: Counts;
}> {
  const [all, rows] = await Promise.all([
    db.select().from(decks).orderBy(asc(sql`${decks.name} COLLATE NOCASE`)),
    topicRows(at),
  ]);

  const byDeck = new Map<string, { counts: Counts; topicCount: number }>();
  for (const deck of all) byDeck.set(deck.id, { counts: empty(), topicCount: 0 });

  const totals = empty();
  for (const row of rows) {
    const entry = byDeck.get(row.deckId);
    if (!entry) continue;
    entry.topicCount += 1;
    const counts = { ...empty(), ...row, percent: 0 };
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

/** One deck, its topics, and the counts for both. */
export async function getDeckView(
  deckId: string,
  at = Date.now(),
): Promise<{ deck: Deck; topics: TopicSummary[]; counts: Counts } | null> {
  const [deck] = await db.select().from(decks).where(eq(decks.id, deckId)).limit(1);
  if (!deck) return null;

  const [rows, all] = await Promise.all([
    topicRows(at),
    db
      .select()
      .from(topics)
      .where(eq(topics.deckId, deckId))
      .orderBy(asc(sql`${topics.name} COLLATE NOCASE`)),
  ]);

  const counted = new Map(rows.map((r) => [r.topicId, r]));
  const counts = empty();
  const summaries = all.map((topic) => {
    const row = counted.get(topic.id);
    const own = sealed({ ...empty(), ...(row ?? {}), percent: 0 });
    add(counts, own);
    return { ...topic, counts: own };
  });

  return { deck, topics: summaries, counts: sealed(counts) };
}

export type CardRow = Card & { state: number | null; due: number | null };

/** One topic, its deck, and every card in it — the topic screen. */
export async function getTopicView(
  topicId: string,
  at = Date.now(),
): Promise<{ topic: Topic; deck: Deck; cards: CardRow[]; counts: Counts } | null> {
  const [found] = await db
    .select({ topic: topics, deck: decks })
    .from(topics)
    .innerJoin(decks, eq(decks.id, topics.deckId))
    .where(eq(topics.id, topicId))
    .limit(1);
  if (!found) return null;

  const rows = await db
    .select({
      id: cards.id,
      topicId: cards.topicId,
      title: cards.title,
      points: cards.points,
      position: cards.position,
      createdAt: cards.createdAt,
      updatedAt: cards.updatedAt,
      state: reviewState.state,
      due: reviewState.due,
    })
    .from(cards)
    .leftJoin(reviewState, eq(reviewState.cardId, cards.id))
    .where(eq(cards.topicId, topicId))
    .orderBy(asc(cards.position), asc(cards.createdAt));

  const counts = sealed({
    cards: rows.length,
    due: rows.filter((r) => r.due !== null && r.due <= at).length,
    learned: rows.filter((r) => r.state === 2).length,
    percent: 0,
    lastStudied: null,
  });

  return { topic: found.topic, deck: found.deck, cards: rows, counts };
}

/**
 * Consecutive days with at least one review, counting back from today — or from
 * yesterday, so a day you have not started yet does not read as a break.
 *
 * Its own small query rather than a field on `getProgress`: the home page wants
 * this one number and none of the rest of that page's work.
 */
export async function getStreak(at = Date.now()): Promise<number> {
  const today = Math.floor(at / DAY_MS);
  const rows = await db.all<{ day: number }>(sql`
    SELECT DISTINCT CAST(${reviewLogs.reviewedAt} / ${DAY_MS} AS INTEGER) AS day
    FROM ${reviewLogs}
    WHERE ${reviewLogs.reviewedAt} >= ${(today - 365) * DAY_MS}
    ORDER BY day DESC
  `);
  const days = new Set(rows.map((r) => r.day));
  let streak = 0;
  for (let day = days.has(today) ? today : today - 1; days.has(day); day--) streak += 1;
  return streak;
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
  points: string[];
  topicName: string;
  state: ReviewStateRow;
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
 * nearest to due first. There is no separate practice mode to choose — a
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
    topicName: string;
    band: number;
    due: number;
    stability: number;
    difficulty: number;
    elapsedDays: number;
    scheduledDays: number;
    learningSteps: number;
    reps: number;
    lapses: number;
    state: number;
    lastReview: number | null;
  }>(sql`
    SELECT
      ${cards.id} AS id,
      ${cards.title} AS title,
      ${cards.points} AS points,
      ${topics.id} AS topicId,
      ${topics.name} AS topicName,
      CASE
        WHEN ${reviewState.due} <= ${at} THEN 0
        WHEN ${reviewState.state} = 0 THEN 1
        ELSE 2
      END AS band,
      ${reviewState.due} AS due,
      ${reviewState.stability} AS stability,
      ${reviewState.difficulty} AS difficulty,
      ${reviewState.elapsedDays} AS elapsedDays,
      ${reviewState.scheduledDays} AS scheduledDays,
      ${reviewState.learningSteps} AS learningSteps,
      ${reviewState.reps} AS reps,
      ${reviewState.lapses} AS lapses,
      ${reviewState.state} AS state,
      ${reviewState.lastReview} AS lastReview
    FROM ${cards}
    JOIN ${topics} ON ${topics.id} = ${cards.topicId}
    JOIN ${reviewState} ON ${reviewState.cardId} = ${cards.id}
    ${where}
    ORDER BY band, ${reviewState.due}, ${cards.position}
  `);

  const bands: QueueCard[][] = [[], [], []];
  for (const row of rows) {
    bands[row.band].push({
      id: row.id,
      title: row.title,
      points: parsePoints(row.points),
      topicName: row.topicName,
      state: {
        cardId: row.id,
        due: row.due,
        stability: row.stability,
        difficulty: row.difficulty,
        elapsedDays: row.elapsedDays,
        scheduledDays: row.scheduledDays,
        learningSteps: row.learningSteps,
        reps: row.reps,
        lapses: row.lapses,
        state: row.state,
        lastReview: row.lastReview,
      },
    });
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

/** `points` comes back from a raw query as JSON text rather than through
 * Drizzle's column mapping. */
function parsePoints(value: string | string[]): string[] {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/* ==========================================================================
   Progress
   ========================================================================== */

export type Progress = {
  totalCards: number;
  /** The four states a card can be in, which sum to `totalCards`. */
  memory: { mature: number; young: number; learning: number; unseen: number };
  percent: number;
  streak: number;
  reviewsToday: number;
  /** Share of the last 30 days' answers that were not Again. Null until graded. */
  recall: number | null;
  /** epoch-day (UTC) -> reviews, for the past year. */
  heatmap: Record<number, number>;
  today: number;
  /** Weakest first — the page's answer to "what should I work on". */
  decks: { id: string; name: string; cards: number; percent: number; recall: number | null }[];
};

export async function getProgress(at = Date.now()): Promise<Progress> {
  const today = Math.floor(at / DAY_MS);
  const yearFrom = (today - 364) * DAY_MS;
  const recentFrom = at - 30 * DAY_MS;

  const [memoryRows, byDay, recent, deckRows, totalCards] = await Promise.all([
    db.all<{ bucket: string; n: number }>(sql`
      SELECT
        CASE
          WHEN ${reviewState.state} = 0 THEN 'unseen'
          WHEN ${reviewState.state} IN (1, 3) THEN 'learning'
          WHEN ${reviewState.stability} >= ${MATURE_DAYS} THEN 'mature'
          ELSE 'young'
        END AS bucket,
        COUNT(*) AS n
      FROM ${reviewState} GROUP BY bucket
    `),
    /* Counted by SQLite and returned already reduced. review_logs is the one
       table that grows without bound, so it is the one never read whole. The
       CAST is not decoration: a bound parameter arrives as REAL, so the
       division would be float and every row would land in its own bucket. */
    db.all<{ day: number; n: number }>(sql`
      SELECT CAST(${reviewLogs.reviewedAt} / ${DAY_MS} AS INTEGER) AS day, COUNT(*) AS n
      FROM ${reviewLogs} WHERE ${reviewLogs.reviewedAt} >= ${yearFrom}
      GROUP BY day ORDER BY day
    `),
    db.all<{ total: number; recalled: number }>(sql`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN ${reviewLogs.rating} > 1 THEN 1 ELSE 0 END) AS recalled
      FROM ${reviewLogs} WHERE ${reviewLogs.reviewedAt} >= ${recentFrom}
    `),
    db.all<{ id: string; name: string; cards: number; learned: number; total: number; recalled: number }>(sql`
      SELECT
        ${decks.id} AS id,
        ${decks.name} AS name,
        COUNT(DISTINCT ${cards.id}) AS cards,
        COUNT(DISTINCT CASE WHEN ${reviewState.state} = 2 THEN ${cards.id} END) AS learned,
        COALESCE(SUM(CASE WHEN ${reviewLogs.reviewedAt} >= ${recentFrom} THEN 1 ELSE 0 END), 0) AS total,
        COALESCE(SUM(CASE WHEN ${reviewLogs.reviewedAt} >= ${recentFrom} AND ${reviewLogs.rating} > 1 THEN 1 ELSE 0 END), 0) AS recalled
      FROM ${decks}
      LEFT JOIN ${topics} ON ${topics.deckId} = ${decks.id}
      LEFT JOIN ${cards} ON ${cards.topicId} = ${topics.id}
      LEFT JOIN ${reviewState} ON ${reviewState.cardId} = ${cards.id}
      LEFT JOIN ${reviewLogs} ON ${reviewLogs.cardId} = ${cards.id}
      GROUP BY ${decks.id}
    `),
    db.$count(cards),
  ]);

  const memory = { mature: 0, young: 0, learning: 0, unseen: 0 };
  for (const row of memoryRows) {
    memory[row.bucket as keyof typeof memory] = row.n;
  }
  // A card with no schedule row at all has never been seen either.
  const scheduled = memory.mature + memory.young + memory.learning + memory.unseen;
  memory.unseen += totalCards - scheduled;

  const heatmap: Record<number, number> = {};
  for (const row of byDay) heatmap[row.day] = row.n;

  // Consecutive days with at least one review, counting back from today — or
  // from yesterday, so a day you haven't started yet doesn't read as a break.
  let streak = 0;
  for (let day = heatmap[today] ? today : today - 1; heatmap[day]; day--) streak += 1;

  const recentTotal = recent[0]?.total ?? 0;
  const held = memory.mature + memory.young;

  return {
    totalCards,
    memory,
    percent: totalCards === 0 ? 0 : Math.round((held / totalCards) * 100),
    streak,
    reviewsToday: heatmap[today] ?? 0,
    recall: recentTotal === 0 ? null : Math.round(((recent[0].recalled ?? 0) / recentTotal) * 100),
    heatmap,
    today,
    decks: deckRows
      .map((d) => ({
        id: d.id,
        name: d.name,
        cards: d.cards,
        percent: d.cards === 0 ? 0 : Math.round((d.learned / d.cards) * 100),
        recall: d.total === 0 ? null : Math.round((d.recalled / d.total) * 100),
      }))
      .sort((a, b) => (a.recall ?? 101) - (b.recall ?? 101) || a.name.localeCompare(b.name)),
  };
}
