import "server-only";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { reviewState, reviewLogs } from "@/db/schema";
import {
  fsrsCardToRow,
  rowToFsrsCard,
  grade,
  intervalPreviews,
  type Grade,
} from "@/lib/fsrs";

export type ReviewResult = {
  /** When the card is next due (epoch ms). */
  nextDue: number;
  /** Card state after grading (0 New, 1 Learning, 2 Review, 3 Relearning). */
  state: number;
  /** Fresh interval previews for the new state (for re-queuing). */
  previews: Record<number, string>;
};

/**
 * Apply a self-grade to a card: advance its FSRS state, persist it, and append
 * a review log. Returns the new due time, state, and previews so the client can
 * re-queue cards that lapse back into the current session.
 *
 * Deliberately NOT a Server Action: it's called from the review UI via fetch so
 * that grading a card doesn't trigger an RSC refresh of the review route (which
 * would discard the client-managed session queue).
 */
export async function applyReview(
  cardId: string,
  rating: Grade,
): Promise<ReviewResult | null> {
  const now = new Date();
  const [row] = await db
    .select()
    .from(reviewState)
    .where(eq(reviewState.cardId, cardId))
    .limit(1);
  if (!row) return null;

  const current = rowToFsrsCard(row);
  const { card: next, log } = grade(current, rating, now);

  db.transaction((tx) => {
    tx.update(reviewState)
      .set(fsrsCardToRow(next))
      .where(eq(reviewState.cardId, cardId))
      .run();
    tx.insert(reviewLogs)
      .values({
        id: nanoid(),
        cardId,
        rating: log.rating,
        state: log.state,
        stability: log.stability,
        difficulty: log.difficulty,
        due: log.due.getTime(),
        reviewedAt: now.getTime(),
      })
      .run();
  });

  return {
    nextDue: next.due.getTime(),
    state: next.state,
    previews: intervalPreviews(next, now),
  };
}
