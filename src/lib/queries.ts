import "server-only";
import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";
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
  state: ReviewStateRow;
};

/** The review queue for a deck (and its sub-decks): cards due now, earliest first. */
export async function getDueCards(
  deckId: string,
  now = Date.now(),
  limit = 500,
): Promise<DueCard[]> {
  const deckIds = await getDeckAndDescendantIds(deckId);
  const rows = await db
    .select({ card: cards, state: reviewState })
    .from(reviewState)
    .innerJoin(cards, eq(cards.id, reviewState.cardId))
    .where(and(inArray(cards.deckId, deckIds), lte(reviewState.due, now)))
    .orderBy(asc(reviewState.due))
    .limit(limit);
  return rows.map((r) => ({
    id: r.card.id,
    front: r.card.front,
    back: r.card.back,
    state: r.state,
  }));
}

export type Stats = {
  totalCards: number;
  reviewsToday: number;
  streak: number;
  /** epoch-day (UTC) of "today", so callers don't read the clock in render. */
  today: number;
  /** epoch-day (UTC) -> review count, for the heatmap. */
  heatmap: Record<number, number>;
};

const DAY_MS = 86_400_000;

export async function getStats(now = Date.now()): Promise<Stats> {
  const totalCards = await db.$count(cards);

  const logs = await db
    .select({ reviewedAt: reviewLogs.reviewedAt })
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

  return { totalCards, reviewsToday, streak, today, heatmap };
}
