import "server-only";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { reviewState, reviewLogs } from "@/db/schema";
import { fsrsCardToRow, rowToFsrsCard, grade, type Grade } from "@/lib/fsrs";

export type ReviewResult = {
  /** Card state after grading (0 New, 1 Learning, 2 Review, 3 Relearning). */
  state: number;
};

/**
 * Apply a self-grade: advance the card's FSRS state, persist it, and append a
 * log. Returns the new state so the client can re-queue a card that lapsed
 * back into the session it is in.
 *
 * Deliberately not a Server Action — it is called over fetch so that grading
 * doesn't trigger an RSC refresh of the study route and discard the queue the
 * client is holding.
 */
export async function applyReview(cardId: string, rating: Grade): Promise<ReviewResult | null> {
  const at = new Date();
  const [row] = await db
    .select()
    .from(reviewState)
    .where(eq(reviewState.cardId, cardId))
    .limit(1);
  if (!row) return null;

  const { card: next } = grade(rowToFsrsCard(row), rating, at);

  db.transaction((tx) => {
    tx.update(reviewState)
      .set(fsrsCardToRow(next))
      .where(eq(reviewState.cardId, cardId))
      .run();
    tx.insert(reviewLogs)
      .values({ id: nanoid(), cardId, rating, reviewedAt: at.getTime() })
      .run();
  });

  return { state: next.state };
}
