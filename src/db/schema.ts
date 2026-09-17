import { sqliteTable, text, integer, real, index, unique } from "drizzle-orm/sqlite-core";

/**
 * The hierarchy is exactly two levels deep — deck, then topic — and it is
 * spelled out in the tables rather than left to a convention. The old schema
 * had one self-referencing `decks` table, so "how deep can this go" was
 * whatever the data happened to contain, and every screen had to answer it at
 * runtime. Two tables make the depth a fact of the model: a deck holds topics,
 * a topic holds cards, and there is nowhere else for a card to be.
 */
export const decks = sqliteTable("decks", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at").notNull(),
});

export const topics = sqliteTable(
  "topics",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("topics_deck_idx").on(t.deckId),
    // Two topics of the same name inside one deck are the same topic. The
    // importer relies on this to resolve "Golden Ticket" to a single row.
    unique("topics_deck_name_unique").on(t.deckId, t.name),
  ],
);

/**
 * A card is a question and the two-to-six points that answer it. `points` is a
 * JSON array of strings, each one line of inline markup — which is the whole
 * content model, so it is stored as the shape it is authored and rendered in
 * rather than as a blob of markdown to be re-parsed on every render.
 *
 * `(topic_id, title)` is the card's identity for import: re-importing a
 * corrected file updates the points of a card with the same title and leaves
 * its schedule alone.
 */
export const cards = sqliteTable(
  "cards",
  {
    id: text("id").primaryKey(),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    points: text("points", { mode: "json" }).notNull().$type<string[]>(),
    /** Authoring order within the topic, so an import reads back as written. */
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    index("cards_topic_idx").on(t.topicId),
    unique("cards_topic_title_unique").on(t.topicId, t.title),
  ],
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
 * Append-only history of every grading. It is what the Progress page reads,
 * and the only table here that grows without bound.
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
    reviewedAt: integer("reviewed_at").notNull(),
  },
  (t) => [
    index("review_logs_card_idx").on(t.cardId),
    index("review_logs_reviewed_idx").on(t.reviewedAt),
  ],
);

export type Deck = typeof decks.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type ReviewStateRow = typeof reviewState.$inferSelect;
