import "server-only";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
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
  const cardRows = await db
    .select({ id: cards.id, deckId: cards.deckId, due: reviewState.due })
    .from(cards)
    .leftJoin(reviewState, eq(reviewState.cardId, cards.id));

  const map = descendantMap(all);
  const byDeckDirect = new Map<string, { total: number; due: number }>();
  for (const row of cardRows) {
    const agg = byDeckDirect.get(row.deckId) ?? { total: 0, due: 0 };
    agg.total += 1;
    if (row.due !== null && row.due <= now) agg.due += 1;
    byDeckDirect.set(row.deckId, agg);
  }

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
): Promise<DueCard[]> {
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
    .orderBy(asc(cards.rung), asc(reviewState.due))
    .limit(limit);
  return rows.map((r) => ({
    id: r.card.id,
    front: r.card.front,
    back: r.card.back,
    rung: r.card.rung,
    conceptId: r.card.conceptId,
    state: r.state,
  }));
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
  return rows.map((r) => ({
    id: r.card.id,
    front: r.card.front,
    back: r.card.back,
    rung: r.card.rung,
    conceptId: r.card.conceptId,
    state: r.state,
  }));
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
  const totalCards = await db.$count(cards);

  const logs = await db
    .select({ reviewedAt: reviewLogs.reviewedAt, rating: reviewLogs.rating })
    .from(reviewLogs)
    .orderBy(asc(reviewLogs.reviewedAt));

  const heatmap: Record<number, number> = {};
  for (const l of logs) {
    const day = Math.floor(l.reviewedAt / DAY_MS);
    heatmap[day] = (heatmap[day] ?? 0) + 1;
  }

  const today = Math.floor(now / DAY_MS);
  const reviewsToday = heatmap[today] ?? 0;

  // Streak: consecutive days with >=1 review, counting back from today
  // (or yesterday, so an as-yet-unreviewed today doesn't break the streak).
  let streak = 0;
  let cursor = heatmap[today] ? today : today - 1;
  while (heatmap[cursor]) {
    streak += 1;
    cursor -= 1;
  }

  // Best streak: the longest run in the studied days, which are already sorted
  // because the logs were.
  const studied = Object.keys(heatmap)
    .map(Number)
    .sort((a, b) => a - b);
  let bestStreak = 0;
  let run = 0;
  for (let i = 0; i < studied.length; i++) {
    run = i > 0 && studied[i] === studied[i - 1] + 1 ? run + 1 : 1;
    if (run > bestStreak) bestStreak = run;
  }

  const grades = { all: mix(), recent: mix() };
  const recentFrom = now - RECENT_DAYS * DAY_MS;
  for (const l of logs) {
    const key = GRADE_KEY[l.rating];
    if (!key) continue;
    grades.all[key] += 1;
    if (l.reviewedAt >= recentFrom) grades.recent[key] += 1;
  }

  // Scheduling state: the backlog, the fortnight ahead, and how deep the
  // collection has actually become.
  const scheduled = await db
    .select({
      due: reviewState.due,
      state: reviewState.state,
      stability: reviewState.stability,
    })
    .from(reviewState);

  const maturity = { fresh: totalCards - scheduled.length, learning: 0, young: 0, mature: 0 };
  const ahead: Record<number, number> = {};
  let due = 0;
  for (const r of scheduled) {
    if (r.state === 1 || r.state === 3) maturity.learning += 1;
    else if (r.stability >= MATURE_DAYS) maturity.mature += 1;
    else maturity.young += 1;

    if (r.due <= now) due += 1;
    else {
      const day = Math.floor(r.due / DAY_MS);
      if (day <= today + FORECAST_DAYS) ahead[day] = (ahead[day] ?? 0) + 1;
    }
  }

  const forecast = Array.from({ length: FORECAST_DAYS }, (_, i) => ({
    day: today + i + 1,
    count: ahead[today + i + 1] ?? 0,
  }));

  return {
    totalCards,
    reviewsToday,
    streak,
    bestStreak,
    daysStudied: studied.length,
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
