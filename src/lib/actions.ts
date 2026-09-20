"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { decks, topics, cards, reviewState } from "@/db/schema";
import { emptyState, fsrsCardToRow } from "@/lib/fsrs";
import { parseCards, parsePoints, MIN_POINTS } from "@/lib/parse";
import { grantSession, clearSession, clientAddress, requireSession } from "@/lib/auth";
import { secretsMatch } from "@/lib/session";
import { retryAfter, recordFailure, recordSuccess } from "@/lib/throttle";

// ---- Auth ------------------------------------------------------------------

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const caller = await clientAddress();
  const wait = retryAfter(caller);
  if (wait > 0) {
    const seconds = Math.ceil(wait / 1000);
    return {
      error: `Too many attempts. Try again in ${
        seconds < 60 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`
      }.`,
    };
  }

  const password = String(formData.get("password") ?? "");
  const expected = process.env.AUTH_PASSWORD;
  // `secretsMatch` compares digests, not the strings: `!==` returns as soon as
  // two characters differ, which tells a patient caller how much of a guess was
  // right. Unlimited guesses is the bigger half of that problem, and the
  // throttle above is what answers it.
  if (!expected || !(await secretsMatch(password, expected))) {
    recordFailure(caller);
    return { error: "Incorrect password" };
  }

  recordSuccess(caller);
  await grantSession();
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

// ---- Import ----------------------------------------------------------------

export type ImportState = {
  error: string | null;
  /** Line-level problems, exactly as the preview showed them. */
  issues?: { line: number | null; message: string }[];
};

/**
 * Write a paste of cards into one topic.
 *
 * The whole thing is re-parsed here rather than trusted from the browser, and a
 * single problem stops the write: a half-imported topic is worse than a failed
 * import, because nothing on screen afterwards says which half.
 *
 * A card is identified by its question within its topic. Importing a corrected
 * file updates the points of the questions it already has and adds the ones it
 * doesn't — scheduling and review history survive, which is the entire reason
 * the identity is the question rather than a row id.
 */
export async function importCards(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireSession();

  const text = String(formData.get("text") ?? "");
  const deckId = String(formData.get("deckId") ?? "").trim();
  const newDeck = String(formData.get("newDeck") ?? "").trim();
  const topicId = String(formData.get("topicId") ?? "").trim();
  const newTopic = String(formData.get("newTopic") ?? "").trim();

  if (!deckId && !newDeck) return { error: "Choose a deck, or name a new one." };
  if (!topicId && !newTopic) return { error: "Choose a topic, or name a new one." };

  const { cards: parsed, issues } = parseCards(text);
  if (issues.length > 0) {
    return { error: "Fix the problems below, then import.", issues };
  }

  const at = Date.now();
  let targetTopic = topicId;
  let targetDeck = deckId;

  try {
    db.transaction((tx) => {
      if (!targetDeck) {
        const existing: { id: string } | undefined = tx
          .select({ id: decks.id })
          .from(decks)
          .where(sql`${decks.name} = ${newDeck} COLLATE NOCASE`)
          .limit(1)
          .get();
        targetDeck = existing?.id ?? nanoid();
        if (!existing) {
          tx.insert(decks).values({ id: targetDeck, name: newDeck, createdAt: at }).run();
        }
      }

      if (!targetTopic) {
        const existing: { id: string } | undefined = tx
          .select({ id: topics.id })
          .from(topics)
          .where(
            and(eq(topics.deckId, targetDeck), sql`${topics.name} = ${newTopic} COLLATE NOCASE`),
          )
          .limit(1)
          .get();
        targetTopic = existing?.id ?? nanoid();
        if (!existing) {
          tx.insert(topics)
            .values({ id: targetTopic, deckId: targetDeck, name: newTopic, createdAt: at })
            .run();
        }
      }

      parsed.forEach((card, index) => {
        const existing: { id: string } | undefined = tx
          .select({ id: cards.id })
          .from(cards)
          .where(and(eq(cards.topicId, targetTopic), eq(cards.title, card.title)))
          .limit(1)
          .get();

        if (existing) {
          tx.update(cards)
            .set({ points: card.points, position: index, updatedAt: at })
            .where(eq(cards.id, existing.id))
            .run();
          return;
        }

        const id = nanoid();
        tx.insert(cards)
          .values({
            id,
            topicId: targetTopic,
            title: card.title,
            points: card.points,
            position: index,
            createdAt: at,
            updatedAt: at,
          })
          .run();
        tx.insert(reviewState)
          .values({ cardId: id, ...fsrsCardToRow(emptyState(new Date(at))) })
          .run();
      });
    });
  } catch {
    return { error: "Could not write those cards. Nothing was imported." };
  }

  revalidatePath("/", "layout");
  redirect(`/topics/${targetTopic}?imported=${parsed.length}`);
}

// ---- Cards -----------------------------------------------------------------

export type CardState = { error: string | null };

/**
 * Edit one card in place.
 *
 * The box holds the same format the importer reads — markers, numbers and all —
 * so it is read back with the importer's own parser rather than a second,
 * nearly-identical rule that would drift away from it. The old editor split on
 * newlines and stripped the markers, which is why a card saved here could never
 * be reopened with its bullets, let alone with anything nested under them.
 */
export async function saveCard(_prev: CardState, formData: FormData): Promise<CardState> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const { points, issues } = parsePoints(String(formData.get("points") ?? ""));

  if (!id) return { error: "That card no longer exists." };
  if (!title) return { error: "A card needs a question." };
  // One problem at a time: the box is a handful of lines, and the line number
  // the importer reports has nothing to point at here.
  if (issues.length > 0) return { error: issues[0].message };
  if (points.items.length < MIN_POINTS) {
    return { error: "A card needs at least one point." };
  }

  const [card] = await db
    .select({ topicId: cards.topicId })
    .from(cards)
    .where(eq(cards.id, id))
    .limit(1);
  if (!card) return { error: "That card no longer exists." };

  // Two cards in a topic cannot ask the same question — the importer relies on
  // it, so the editor cannot be the thing that breaks it.
  const clash = await db
    .select({ id: cards.id })
    .from(cards)
    .where(and(eq(cards.topicId, card.topicId), eq(cards.title, title)))
    .limit(1);
  if (clash[0] && clash[0].id !== id) {
    return { error: "Another card in this topic already asks that question." };
  }

  await db.update(cards).set({ title, points, updatedAt: Date.now() }).where(eq(cards.id, id));
  revalidatePath(`/topics/${card.topicId}`);
  return { error: null };
}

export async function deleteCard(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const topicId = String(formData.get("topicId") ?? "");
  if (!id) return;
  await db.delete(cards).where(eq(cards.id, id));
  revalidatePath("/", "layout");
  revalidatePath(`/topics/${topicId}`);
}

// ---- Decks and topics ------------------------------------------------------

/**
 * Deck names are unique, and topic names are unique within their deck — the
 * importer resolves a name to a row, so two of the same name is not a thing
 * that can exist. Renaming onto a name already taken therefore fails at the
 * database, and it fails here rather than on the error page: the heading snaps
 * back to what it was, which is what "that name is taken" looks like on a
 * control that is just the heading.
 */
export async function renameDeck(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  try {
    await db.update(decks).set({ name }).where(eq(decks.id, id));
  } catch {
    return;
  }
  revalidatePath("/", "layout");
}

export async function renameTopic(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  try {
    await db.update(topics).set({ name }).where(eq(topics.id, id));
  } catch {
    return;
  }
  revalidatePath("/", "layout");
}

/** Deletes the deck, its topics, their cards, and all of their history. */
export async function deleteDeck(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(decks).where(eq(decks.id, id));
  revalidatePath("/", "layout");
  redirect("/");
}

export async function deleteTopic(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const deckId = String(formData.get("deckId") ?? "");
  if (!id) return;
  await db.delete(topics).where(eq(topics.id, id));
  revalidatePath("/", "layout");
  redirect(deckId ? `/decks/${deckId}` : "/");
}

// Grading lives in a route handler (src/app/api/review) rather than a Server
// Action, so answering a card doesn't refresh the study route underneath the
// session queue. See src/lib/review.ts.
