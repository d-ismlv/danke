import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { decks, cards, reviewState, reviewLogs } from "@/db/schema";
import type { Deck, Card, ReviewStateRow } from "@/db/schema";

/** Current server time. Wrapped so pages don't call `Date.now()` directly in
 * render (which the React purity lint rejects). */
export function serverNow(): number {
  return Date.now();
}

export type DeckNode = Deck & {
  depth: number;
  /** Direct + descendant cards. */
  total: number;
  /** Direct + descendant cards due now. */
  due: number;
};

/** Map each deck to the set of its own id plus all descendant ids. */
function descendantMap(all: Deck[]): Map<string, Set<string>> {
  const children = new Map<string, Deck[]>();
  for (const d of all) {
    const key = d.parentId ?? "__root__";
    (children.get(key) ?? children.set(key, []).get(key)!).push(d);
  }
  const map = new Map<string, Set<string>>();
  const collect = (id: string): Set<string> => {
    if (map.has(id)) return map.get(id)!;
    const set = new Set<string>([id]);
    for (const child of children.get(id) ?? []) {
      for (const cid of collect(child.id)) set.add(cid);
    }
    map.set(id, set);
    return set;
  };
  for (const d of all) collect(d.id);
  return map;
}

/** All descendant deck ids (including the deck itself). */
export async function getDeckAndDescendantIds(deckId: string): Promise<string[]> {
  const all = await db.select().from(decks);
  const map = descendantMap(all);
  return [...(map.get(deckId) ?? new Set([deckId]))];
}

/**
 * Full deck tree, ordered depth-first for display, each annotated with total
 * and due counts that include its sub-decks.
 */
export async function getDeckTree(now = Date.now()): Promise<DeckNode[]> {
  const all = await db.select().from(decks).orderBy(asc(decks.name));
  /* One row per deck, not one per card: this used to pull every card in the
     database (joined to its schedule) just to count them, on every visit to
     the page that is also the app's front door. */
  const perDeck = await db.all<{ deckId: string; total: number; due: number }>(sql`
    SELECT
      ${cards.deckId} AS deckId,
      COUNT(*) AS total,
      SUM(CASE WHEN ${reviewState.due} IS NOT NULL AND ${reviewState.due} <= ${now} THEN 1 ELSE 0 END) AS due
    FROM ${cards} LEFT JOIN ${reviewState} ON ${reviewState.cardId} = ${cards.id}
    GROUP BY ${cards.deckId}
  `);

  const map = descendantMap(all);
  const byDeckDirect = new Map<string, { total: number; due: number }>();
  for (const row of perDeck) byDeckDirect.set(row.deckId, { total: row.total, due: row.due });

  const counts = (deckId: string) => {
    let total = 0;
    let due = 0;
    for (const id of map.get(deckId) ?? []) {
      const agg = byDeckDirect.get(id);
      if (agg) {
        total += agg.total;
        due += agg.due;
      }
    }
    return { total, due };
  };

  // Depth-first ordering.
  const childrenOf = new Map<string | null, Deck[]>();
  for (const d of all) {
    const key = d.parentId ?? null;
    (childrenOf.get(key) ?? childrenOf.set(key, []).get(key)!).push(d);
  }
  const out: DeckNode[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const d of childrenOf.get(parentId) ?? []) {
      out.push({ ...d, depth, ...counts(d.id) });
      walk(d.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export async function getDeck(deckId: string): Promise<Deck | undefined> {
  const [d] = await db.select().from(decks).where(eq(decks.id, deckId)).limit(1);
  return d;
}

/** All decks (for parent pickers / breadcrumbs). */
export async function getAllDecks(): Promise<Deck[]> {
  return db.select().from(decks).orderBy(asc(decks.name));
}

export type CardWithState = Card & { due: number | null; state: number | null };

/** Cards belonging directly to a deck, newest first. */
export async function getCardsForDeck(deckId: string): Promise<CardWithState[]> {
  const rows = await db
    .select({
      id: cards.id,
      deckId: cards.deckId,
      front: cards.front,
      back: cards.back,
      createdAt: cards.createdAt,
      updatedAt: cards.updatedAt,
      conceptId: cards.conceptId,
      rung: cards.rung,
      sourceKey: cards.sourceKey,
      due: reviewState.due,
      state: reviewState.state,
    })
    .from(cards)
    .leftJoin(reviewState, eq(reviewState.cardId, cards.id))
    .where(eq(cards.deckId, deckId))
    .orderBy(desc(cards.createdAt));
  return rows;
}

export async function getCard(cardId: string): Promise<Card | undefined> {
  const [c] = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  return c;
}

export type DueCard = {
  id: string;
  front: string;
  back: string;
  /** Ladder position, when the card belongs to one. */
  rung: number | null;
  conceptId: string | null;
  state: ReviewStateRow;
};

/**
 * A slice of the ladder: "rungs 1-2 across AD" is the same deck reviewed at
 * one altitude — every concept's overview, then every concept's mechanism.
 */
export type RungBand = { min: number; max: number };

/** `1-2`, or a single `4`. Anything else means no band. */
export function parseRungBand(value: string | string[] | undefined): RungBand | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(\d)(?:-(\d))?$/.exec(value.trim());
  if (!match) return undefined;
  const min = Number(match[1]);
  const max = match[2] ? Number(match[2]) : min;
  if (min < 1 || max < min || max > 9) return undefined;
  return { min, max };
}

function bandFilter(band?: RungBand) {
  return band
    ? and(gte(cards.rung, band.min), lte(cards.rung, band.max))
    : undefined;
}

/** The review queue for a deck (and its sub-decks): cards due now, earliest first. */
export async function getDueCards(
  deckId: string,
  now = Date.now(),
  limit = 500,
  band?: RungBand,
): Promise<{ cards: DueCard[]; truncated: boolean }> {
  const deckIds = await getDeckAndDescendantIds(deckId);
  const rows = await db
    .select({ card: cards, state: reviewState })
    .from(reviewState)
    .innerJoin(cards, eq(cards.id, reviewState.cardId))
    .where(
      and(
        inArray(cards.deckId, deckIds),
        lte(reviewState.due, now),
        bandFilter(band),
      ),
    )
    /* Earliest due first, as the queue's whole purpose implies. Ordering by
       rung ahead of due sent every rung-1 card in the deck before the card
       that had been overdue for a week — and put ordinary cards, whose rung
       is NULL and therefore sorts first in SQLite, ahead of the lot. A rung
       band is the one case where rung leads: asking for "rungs 3-5" is asking
       to go through one altitude, so within the band the order still climbs. */
    .orderBy(...(band ? [asc(cards.rung)] : []), asc(reviewState.due))
    .limit(limit + 1);
  /* The queue is capped so a 4,000-card backlog doesn't arrive as one payload.
     Fetching one row past the cap is how the caller can say so, rather than
     ending the session early and letting it look finished. */
  return { cards: rows.slice(0, limit).map(toDueCard), truncated: rows.length > limit };
}

function toDueCard(r: { card: Card; state: ReviewStateRow }): DueCard {
  return {
    id: r.card.id,
    front: r.card.front,
    back: r.card.back,
    rung: r.card.rung,
    conceptId: r.card.conceptId,
    state: r.state,
  };
}

/**
 * A non-scheduling practice queue. It can contain every card in a deck tree or
 * one explicitly selected card, regardless of its due date.
 */
export async function getPracticeCards(
  deckId: string,
  cardId?: string,
  limit = 500,
  band?: RungBand,
): Promise<DueCard[]> {
  const deckIds = await getDeckAndDescendantIds(deckId);
  const rows = await db
    .select({ card: cards, state: reviewState })
    .from(reviewState)
    .innerJoin(cards, eq(cards.id, reviewState.cardId))
    .where(
      and(
        inArray(cards.deckId, deckIds),
        cardId ? eq(cards.id, cardId) : undefined,
        bandFilter(band),
      ),
    )
    .orderBy(asc(cards.rung), asc(cards.createdAt))
    .limit(limit);

  /* Practice ran in the same order every time, so a second pass through a deck
     rehearsed the sequence as much as the cards — the answer starts arriving
     from the position rather than the prompt. One card asked for by id is not
     a queue and keeps its order. A ladder keeps its rungs in order too: the
     rungs are a progression, and shuffling them would ask about the boundaries
     of a thing before naming it. */
  const queue = rows.map(toDueCard);
  if (!cardId && !queue.some((c) => c.rung !== null)) shuffle(queue);
  return queue;
}

/** Fisher-Yates, in place. */
function shuffle<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/** Counts of the four grades. 1 Again, 2 Hard, 3 Good, 4 Easy. */
export type GradeMix = { again: number; hard: number; good: number; easy: number };

export type Stats = {
  totalCards: number;
  reviewsToday: number;
  streak: number;
  /** The longest run of consecutive studied days in the history. */
  bestStreak: number;
  /** Days with at least one review — the denominator for "per active day". */
  daysStudied: number;
  /** epoch-day (UTC) of "today", so callers don't read the clock in render. */
  today: number;
  /** epoch-day (UTC) -> review count, for the heatmap. */
  heatmap: Record<number, number>;
  /** Grades over the whole history, and over the last 30 days. */
  grades: { all: GradeMix; recent: GradeMix };
  /**
   * Share of reviews you answered without pressing Again, over the last 30
   * days and over the whole history. This is the one number that says whether
   * the schedule is working: too low and the intervals are outrunning you,
   * too high (past ~95%) and you are reviewing things you already know.
   * Null until something has been graded.
   */
  retention: number | null;
  retentionAll: number | null;
  /** Cards coming due on each of the next 14 days, today first. */
  forecast: { day: number; count: number }[];
  /** Cards due now — the backlog the forecast sits behind. */
  due: number;
  /**
   * How deep the collection is, not just how big: never seen, still being
   * learned, holding for under three weeks, holding for longer.
   */
  maturity: { fresh: number; learning: number; young: number; mature: number };
};

const MATURE_DAYS = 21;
const FORECAST_DAYS = 14;
const RECENT_DAYS = 30;

function mix(): GradeMix {
  return { again: 0, hard: 0, good: 0, easy: 0 };
}

const GRADE_KEY: Record<number, keyof GradeMix> = {
  1: "again",
  2: "hard",
  3: "good",
  4: "easy",
};

/** Reviews answered without pressing Again, as a percentage. */
function retentionOf(m: GradeMix): number | null {
  const total = m.again + m.hard + m.good + m.easy;
  return total === 0 ? null : Math.round(((total - m.again) / total) * 100);
}

const DAY_MS = 86_400_000;

export async function getStats(now = Date.now()): Promise<Stats> {
  const today = Math.floor(now / DAY_MS);
  const recentFrom = now - RECENT_DAYS * DAY_MS;

  /* Everything below is counted by SQLite and comes back already reduced.
     It used to select every row of review_logs and fold them in JS, which is
     fine at a few thousand and is several megabytes of garbage per page view
     after a couple of years of daily study. The logs are the one table here
     that grows without bound, so it is the one that must never be read whole.
     The CASTs are not decoration. A bound parameter arrives as REAL, so
     `reviewed_at / ?` is float division and every row lands in its own bucket
     — 2,820 "days studied" out of 2,820 reviews. Truncating to INTEGER gives
     back the epoch-day the heatmap is keyed by. */
  const [byDay, gradeRows, recentGradeRows, scheduleRows, totalCards] = await Promise.all([
    db.all<{ day: number; n: number }>(sql`
      SELECT CAST(${reviewLogs.reviewedAt} / ${DAY_MS} AS INTEGER) AS day, COUNT(*) AS n
      FROM ${reviewLogs} GROUP BY day ORDER BY day
    `),
    db.all<{ rating: number; n: number }>(sql`
      SELECT ${reviewLogs.rating} AS rating, COUNT(*) AS n
      FROM ${reviewLogs} GROUP BY rating
    `),
    db.all<{ rating: number; n: number }>(sql`
      SELECT ${reviewLogs.rating} AS rating, COUNT(*) AS n
      FROM ${reviewLogs} WHERE ${reviewLogs.reviewedAt} >= ${recentFrom} GROUP BY rating
    `),
    db.all<{ bucket: string; day: number | null; n: number }>(sql`
      SELECT
        CASE
          WHEN ${reviewState.state} IN (1, 3) THEN 'learning'
          WHEN ${reviewState.stability} >= ${MATURE_DAYS} THEN 'mature'
          ELSE 'young'
        END AS bucket,
        CASE
          WHEN ${reviewState.due} <= ${now} THEN -1
          ELSE CAST(${reviewState.due} / ${DAY_MS} AS INTEGER)
        END AS day,
        COUNT(*) AS n
      FROM ${reviewState} GROUP BY bucket, day
    `),
    db.$count(cards),
  ]);

  const heatmap: Record<number, number> = {};
  for (const row of byDay) heatmap[row.day] = row.n;
  const reviewsToday = heatmap[today] ?? 0;

  // Streak: consecutive days with >=1 review, counting back from today
  // (or yesterday, so an as-yet-unreviewed today doesn't break the streak).
  let streak = 0;
  let cursor = heatmap[today] ? today : today - 1;
  while (heatmap[cursor]) {
    streak += 1;
    cursor -= 1;
  }

  // Best streak: the longest run of consecutive days. `byDay` is ordered.
  let bestStreak = 0;
  let run = 0;
  for (let i = 0; i < byDay.length; i++) {
    run = i > 0 && byDay[i].day === byDay[i - 1].day + 1 ? run + 1 : 1;
    if (run > bestStreak) bestStreak = run;
  }

  const grades = { all: mix(), recent: mix() };
  for (const row of gradeRows) {
    const key = GRADE_KEY[row.rating];
    if (key) grades.all[key] = row.n;
  }
  for (const row of recentGradeRows) {
    const key = GRADE_KEY[row.rating];
    if (key) grades.recent[key] = row.n;
  }

  const maturity = { fresh: 0, learning: 0, young: 0, mature: 0 };
  const ahead: Record<number, number> = {};
  let due = 0;
  let scheduled = 0;
  for (const row of scheduleRows) {
    scheduled += row.n;
    maturity[row.bucket as "learning" | "young" | "mature"] += row.n;
    if (row.day === -1) due += row.n;
    else if (row.day !== null && row.day <= today + FORECAST_DAYS) {
      ahead[row.day] = (ahead[row.day] ?? 0) + row.n;
    }
  }
  // A card with no review_state row has never been seen at all.
  maturity.fresh = totalCards - scheduled;

  const forecast = Array.from({ length: FORECAST_DAYS }, (_, i) => ({
    day: today + i + 1,
    count: ahead[today + i + 1] ?? 0,
  }));

  return {
    totalCards,
    reviewsToday,
    streak,
    bestStreak,
    daysStudied: byDay.length,
    today,
    heatmap,
    grades,
    retention: retentionOf(grades.recent),
    retentionAll: retentionOf(grades.all),
    forecast,
    due,
    maturity,
  };
}
