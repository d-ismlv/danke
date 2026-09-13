import "server-only";
import { and, asc, eq, isNotNull, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { cards, decks, reviewLogs, reviewState } from "@/db/schema";
import { MAX_RUNG, RUNG_NAMES } from "@/lib/import";
import type { DueCard } from "@/lib/queries";

export { MAX_RUNG, RUNG_NAMES };

/**
 * A ladder walks one concept through seven progressively harder questions.
 * The drill stops at the first rung missed, and that rung is the *edge* — the
 * one fact worth knowing about a concept you can otherwise recite.
 *
 * Nothing here is stored: `review_logs` is append-only and already records
 * every grading, so the edge is derived from the last grade on each rung.
 * A rung is passed when its most recent answer was Hard, Good or Easy.
 */

export type RungState = "unseen" | "passed" | "edge";

export type LadderRung = {
  rung: number;
  cardId: string;
  front: string;
  state: RungState;
  /** 1 Again, 2 Hard, 3 Good, 4 Easy — the most recent grade, if any. */
  lastRating: number | null;
  lastReviewedAt: number | null;
  due: number;
  reps: number;
};

export type ConceptLadder = {
  conceptId: string;
  deckId: string;
  deckName: string;
  rungs: LadderRung[];
  /** Highest rung passed without a gap, counting from 1. 0 = nothing yet. */
  highest: number;
  /** First rung not passed. `null` once the whole ladder stands. */
  edge: number | null;
  /** How far the ladder has been climbed, as a fraction of its own rungs. */
  cardCount: number;
  dueCount: number;
  reviewedCount: number;
};

/** The first rung not passed, and the highest passed below it. */
function deriveEdge(rungs: LadderRung[]): { highest: number; edge: number | null } {
  const byRung = new Map(rungs.map((r) => [r.rung, r]));
  const top = Math.max(...rungs.map((r) => r.rung));
  let highest = 0;
  for (let n = 1; n <= top; n++) {
    const rung = byRung.get(n);
    if (rung?.state === "passed") highest = n;
    else return { highest, edge: n };
  }
  return { highest, edge: null };
}

/** Most recent grade per card, for the ladder cards only. */
/**
 * The most recent grade on each ladder card.
 *
 * A window function, because the alternative is what this used to do: select
 * every log row for every ladder card — the whole history, not the last of it —
 * and let the last write win as they were folded in JS. That is one row per
 * review ever recorded, on a page that only ever wanted one row per card.
 */
async function lastRatings(): Promise<Map<string, { rating: number; at: number }>> {
  const rows = await db.all<{ cardId: string; rating: number; at: number }>(sql`
    SELECT cardId, rating, at FROM (
      SELECT
        ${reviewLogs.cardId} AS cardId,
        ${reviewLogs.rating} AS rating,
        ${reviewLogs.reviewedAt} AS at,
        ROW_NUMBER() OVER (
          PARTITION BY ${reviewLogs.cardId}
          ORDER BY ${reviewLogs.reviewedAt} DESC, ${reviewLogs}.rowid DESC
        ) AS rn
      FROM ${reviewLogs}
      JOIN ${cards} ON ${cards.id} = ${reviewLogs.cardId}
      WHERE ${cards.conceptId} IS NOT NULL
    ) WHERE rn = 1
  `);
  return new Map(rows.map((r) => [r.cardId, { rating: r.rating, at: r.at }]));
}

/** Every concept that has ladder cards, weakest edge first. */
export async function getConceptLadders(now = Date.now()): Promise<ConceptLadder[]> {
  const rows = await db
    .select({
      cardId: cards.id,
      conceptId: cards.conceptId,
      rung: cards.rung,
      front: cards.front,
      deckId: cards.deckId,
      deckName: decks.name,
      due: reviewState.due,
      reps: reviewState.reps,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .leftJoin(reviewState, eq(reviewState.cardId, cards.id))
    .where(isNotNull(cards.conceptId))
    .orderBy(asc(cards.conceptId), asc(cards.rung));

  const ratings = await lastRatings();

  const byConcept = new Map<string, ConceptLadder>();
  for (const row of rows) {
    const conceptId = row.conceptId!;
    const last = ratings.get(row.cardId) ?? null;
    const rung: LadderRung = {
      rung: row.rung ?? 0,
      cardId: row.cardId,
      front: row.front,
      lastRating: last?.rating ?? null,
      lastReviewedAt: last?.at ?? null,
      due: row.due ?? now,
      reps: row.reps ?? 0,
      state: !last ? "unseen" : last.rating === 1 ? "edge" : "passed",
    };
    const ladder =
      byConcept.get(conceptId) ??
      byConcept
        .set(conceptId, {
          conceptId,
          deckId: row.deckId,
          deckName: row.deckName,
          rungs: [],
          highest: 0,
          edge: 1,
          cardCount: 0,
          dueCount: 0,
          reviewedCount: 0,
        })
        .get(conceptId)!;
    ladder.rungs.push(rung);
    ladder.cardCount += 1;
    if (rung.due <= now) ladder.dueCount += 1;
    if (last) ladder.reviewedCount += 1;
  }

  const ladders = [...byConcept.values()];
  for (const ladder of ladders) {
    ladder.rungs.sort((a, b) => a.rung - b.rung);
    Object.assign(ladder, deriveEdge(ladder.rungs));
  }
  // Weakest first: the lowest edge, then the least-reviewed, then by name —
  // which is the order the map is read in when deciding what to drill.
  return ladders.sort(
    (a, b) =>
      (a.edge ?? MAX_RUNG + 1) - (b.edge ?? MAX_RUNG + 1) ||
      a.reviewedCount - b.reviewedCount ||
      a.conceptId.localeCompare(b.conceptId),
  );
}

export async function getConceptLadder(
  conceptId: string,
  now = Date.now(),
): Promise<ConceptLadder | undefined> {
  const all = await getConceptLadders(now);
  return all.find((l) => l.conceptId === conceptId);
}

/**
 * The drill queue: every rung of one concept in ladder order, due dates
 * ignored. Drill mode walks it and stops at the first Again.
 */
export async function getDrillCards(conceptId: string): Promise<DueCard[]> {
  const rows = await db
    .select({ card: cards, state: reviewState })
    .from(cards)
    .innerJoin(reviewState, eq(reviewState.cardId, cards.id))
    .where(eq(cards.conceptId, conceptId))
    .orderBy(asc(cards.rung));
  return rows.map((r) => ({
    id: r.card.id,
    front: r.card.front,
    back: r.card.back,
    rung: r.card.rung,
    conceptId: r.card.conceptId,
    state: r.state,
  }));
}

/** Whether any ladder content exists at all — the ladder screens say something
 * different (and more useful) when it doesn't. */
export async function countLadderCards(): Promise<number> {
  const rows = await db
    .select({ id: cards.id })
    .from(cards)
    .where(isNotNull(cards.conceptId));
  return rows.length;
}

/** Ladder cards in a deck tree, for the rung-band chooser on a deck page. */
export async function countLadderCardsInDecks(deckIds: string[]): Promise<number> {
  if (deckIds.length === 0) return 0;
  const rows = await db
    .select({ id: cards.id })
    .from(cards)
    .where(and(inArray(cards.deckId, deckIds), isNotNull(cards.conceptId)));
  return rows.length;
}

/** A summary line for the edge map header. */
export function ladderSummary(ladders: ConceptLadder[]) {
  const concepts = ladders.length;
  const complete = ladders.filter((l) => l.edge === null).length;
  const climbed = ladders.reduce((n, l) => n + l.highest, 0);
  const rungs = ladders.reduce((n, l) => n + l.cardCount, 0);
  const due = ladders.reduce((n, l) => n + l.dueCount, 0);
  return { concepts, complete, climbed, rungs, due };
}

export type RungProfile = {
  rung: number;
  /** Gradings recorded against cards at this rung, all time. */
  reviews: number;
  /** Of those, the ones that weren't Again. */
  recalled: number;
  /** `recalled / reviews` as a percentage, or null if the rung is untouched. */
  retention: number | null;
};

/**
 * Recall by rung, 1-7.
 *
 * The ladder's premise is that the rungs get harder in order, and this is the
 * only view that checks it. A profile that falls away after rung 3 says the
 * mechanism is known and the boundaries are not — which is a different problem
 * from a flat-but-low profile, and wants a different kind of study.
 */
export async function getRungProfile(): Promise<RungProfile[]> {
  const rows = await db
    .select({ rung: cards.rung, rating: reviewLogs.rating })
    .from(reviewLogs)
    .innerJoin(cards, eq(cards.id, reviewLogs.cardId))
    .where(isNotNull(cards.rung));

  const tally = new Map<number, { reviews: number; recalled: number }>();
  for (const row of rows) {
    const rung = row.rung ?? 0;
    if (rung < 1 || rung > MAX_RUNG) continue;
    const t = tally.get(rung) ?? tally.set(rung, { reviews: 0, recalled: 0 }).get(rung)!;
    t.reviews += 1;
    if (row.rating > 1) t.recalled += 1;
  }

  return Array.from({ length: MAX_RUNG }, (_, i) => {
    const rung = i + 1;
    const t = tally.get(rung) ?? { reviews: 0, recalled: 0 };
    return {
      rung,
      ...t,
      retention: t.reviews === 0 ? null : Math.round((t.recalled / t.reviews) * 100),
    };
  });
}
