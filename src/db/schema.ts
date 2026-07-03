import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

/**
 * Decks double as categories: a deck with a `parentId` is a sub-deck.
 * Deleting a deck cascades to its cards (and their review state / logs).
 */
export const decks = sqliteTable(
  "decks",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    parentId: text("parent_id"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("decks_parent_idx").on(t.parentId)],
);

/**
 * Card content only. Scheduling lives in `reviewState` so authoring and
 * spaced-repetition concerns stay decoupled.
 */
export const cards = sqliteTable(
  "cards",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    front: text("front").notNull().default(""),
    back: text("back").notNull().default(""),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("cards_deck_idx").on(t.deckId)],
);

/**
 * FSRS-owned scheduling state, 1:1 with a card. Fields mirror the ts-fsrs
 * `Card` interface; `Date`s are stored as epoch-ms integers.
 * `state`: 0 New, 1 Learning, 2 Review, 3 Relearning.
 */
export const reviewState = sqliteTable(
  "review_state",
  {
    cardId: text("card_id")
      .primaryKey()
      .references(() => cards.id, { onDelete: "cascade" }),
    due: integer("due").notNull(),
    stability: real("stability").notNull(),
    difficulty: real("difficulty").notNull(),
    elapsedDays: integer("elapsed_days").notNull(),
    scheduledDays: integer("scheduled_days").notNull(),
    learningSteps: integer("learning_steps").notNull(),
    reps: integer("reps").notNull(),
    lapses: integer("lapses").notNull(),
    state: integer("state").notNull(),
    lastReview: integer("last_review"),
  },
  (t) => [index("review_state_due_idx").on(t.due)],
);

/**
 * Append-only history of every grading, used for progress/heatmap/stats.
 * `rating`: 1 Again, 2 Hard, 3 Good, 4 Easy.
 */
export const reviewLogs = sqliteTable(
  "review_logs",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    state: integer("state").notNull(),
    stability: real("stability").notNull(),
    difficulty: real("difficulty").notNull(),
    due: integer("due").notNull(),
    reviewedAt: integer("reviewed_at").notNull(),
  },
  (t) => [
    index("review_logs_card_idx").on(t.cardId),
    index("review_logs_reviewed_idx").on(t.reviewedAt),
  ],
);

export type Deck = typeof decks.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type ReviewStateRow = typeof reviewState.$inferSelect;
export type ReviewLogRow = typeof reviewLogs.$inferSelect;
