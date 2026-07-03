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
export const scheduler = fsrs(
  generatorParameters({ enable_fuzz: true, enable_short_term: true }),
);

export { Rating, State };
export type { Grade };

/** The four self-grading choices, in display order. */
export const GRADES: { rating: Grade; label: string }[] = [
  { rating: Rating.Again, label: "Again" },
  { rating: Rating.Hard, label: "Hard" },
  { rating: Rating.Good, label: "Good" },
  { rating: Rating.Easy, label: "Easy" },
];

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

/**
 * Apply a grade to a card's current state, returning the next state plus a
 * preview of how far each grade would push the due date (for button hints).
 */
export function grade(current: FsrsCard, rating: Grade, now = new Date()) {
  const record = scheduler.repeat(current, now);
  return record[rating];
}

/** Human-friendly interval preview for each grade, e.g. "4d" / "10m". */
export function intervalPreviews(
  current: FsrsCard,
  now = new Date(),
): Record<Grade, string> {
  const record = scheduler.repeat(current, now);
  const out = {} as Record<Grade, string>;
  for (const { rating } of GRADES) {
    out[rating] = formatInterval(record[rating].card.due, now);
  }
  return out;
}

function formatInterval(due: Date, now: Date): string {
  const mins = Math.max(1, Math.round((due.getTime() - now.getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.round(months / 12)}y`;
}
