import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  State,
  type Card as FsrsCard,
  type Grade,
} from "ts-fsrs";
import type { ReviewStateRow } from "@/db/schema";

/**
 * Scheduler instance. `enable_fuzz` spreads due dates slightly so large decks
 * don't pile every card onto the same day.
 */
const scheduler = fsrs(
  generatorParameters({ enable_fuzz: true, enable_short_term: true }),
);

export { Rating };
export type { Grade };

/** Build the FSRS state for a brand-new card. */
export function emptyState(now = new Date()): FsrsCard {
  return createEmptyCard(now);
}

/** DB row -> ts-fsrs Card (epoch-ms integers back into Dates). */
export function rowToFsrsCard(row: ReviewStateRow): FsrsCard {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    learning_steps: row.learningSteps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.lastReview ? new Date(row.lastReview) : undefined,
  };
}

/** ts-fsrs Card -> DB column values (Dates flattened to epoch-ms). */
export function fsrsCardToRow(card: FsrsCard): Omit<ReviewStateRow, "cardId"> {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.getTime() : null,
  };
}

/** Apply a grade to a card's current state, returning the scheduled next one. */
export function grade(current: FsrsCard, rating: Grade, now = new Date()) {
  const record = scheduler.repeat(current, now);
  return record[rating];
}
