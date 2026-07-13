"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { decks, cards, reviewState, reviewLogs } from "@/db/schema";
import { emptyState, fsrsCardToRow } from "@/lib/fsrs";
import { parseCards, type SeparatorKey } from "@/lib/import";
import { grantSession, clearSession } from "@/lib/auth";
import { cleanupUnreferencedMedia, extractMediaIds } from "@/lib/media-cleanup";
import { getDeckAndDescendantIds } from "@/lib/queries";

// ---- Auth ------------------------------------------------------------------

export type LoginState = { error: string | null };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!process.env.AUTH_PASSWORD || password !== process.env.AUTH_PASSWORD) {
    return { error: "Incorrect password" };
  }
  await grantSession();
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

// ---- Decks -----------------------------------------------------------------

export async function createDeck(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const parentId = (formData.get("parentId") as string) || null;
  if (!name) return;
  await db.insert(decks).values({
    id: nanoid(),
    name,
    parentId,
    createdAt: Date.now(),
  });
  revalidatePath("/");
}

export async function renameDeck(formData: FormData) {
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  await db.update(decks).set({ name }).where(eq(decks.id, id));
  revalidatePath("/");
  revalidatePath(`/decks/${id}`);
}

export async function deleteDeck(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;
  const removedCards = await db
    .select({ front: cards.front, back: cards.back })
    .from(cards)
    .where(eq(cards.deckId, id));
  const removedMedia = new Set<string>();
  for (const card of removedCards) {
    for (const mediaId of extractMediaIds(`${card.front}\n${card.back}`)) {
      removedMedia.add(mediaId);
    }
  }
  // Cascades to child decks' cards via FK; re-parent child decks to root first
  // so they aren't orphaned (child decks have no cascade on parent_id).
  await db.update(decks).set({ parentId: null }).where(eq(decks.parentId, id));
  await db.delete(decks).where(eq(decks.id, id));
  await cleanupUnreferencedMedia(removedMedia);
  revalidatePath("/");
  redirect("/");
}

// ---- Cards -----------------------------------------------------------------

export async function createCard(formData: FormData) {
  const deckId = String(formData.get("deckId"));
  const front = String(formData.get("front") ?? "");
  const back = String(formData.get("back") ?? "");
  const again = formData.get("addAnother") === "1";
  if (!deckId || (!front.trim() && !back.trim())) return;

  const id = nanoid();
  const now = Date.now();
  await db.transaction((tx) => {
    tx.insert(cards)
      .values({ id, deckId, front, back, createdAt: now, updatedAt: now })
      .run();
    tx.insert(reviewState)
      .values({ cardId: id, ...fsrsCardToRow(emptyState(new Date(now))) })
      .run();
  });

  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/");
  if (again) redirect(`/decks/${deckId}/cards/new`);
  redirect(`/decks/${deckId}`);
}

export async function updateCard(formData: FormData) {
  const id = String(formData.get("id"));
  const deckId = String(formData.get("deckId"));
  const front = String(formData.get("front") ?? "");
  const back = String(formData.get("back") ?? "");
  if (!id) return;
  const [previous] = await db
    .select({ front: cards.front, back: cards.back })
    .from(cards)
    .where(eq(cards.id, id))
    .limit(1);
  await db
    .update(cards)
    .set({ front, back, updatedAt: Date.now() })
    .where(eq(cards.id, id));
  if (previous) {
    const oldMedia = extractMediaIds(`${previous.front}\n${previous.back}`);
    const currentMedia = extractMediaIds(`${front}\n${back}`);
    await cleanupUnreferencedMedia(
      [...oldMedia].filter((mediaId) => !currentMedia.has(mediaId)),
    );
  }
  revalidatePath(`/decks/${deckId}`);
  redirect(`/decks/${deckId}`);
}

export async function deleteCard(formData: FormData) {
  const id = String(formData.get("id"));
  const deckId = String(formData.get("deckId"));
  if (!id) return;
  const [removed] = await db
    .select({ front: cards.front, back: cards.back })
    .from(cards)
    .where(eq(cards.id, id))
    .limit(1);
  await db.delete(cards).where(eq(cards.id, id));
  if (removed) {
    await cleanupUnreferencedMedia(
      extractMediaIds(`${removed.front}\n${removed.back}`),
    );
  }
  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/");
  revalidatePath("/stats");
}

export async function resetCardProgress(formData: FormData) {
  const id = String(formData.get("id"));
  const deckId = String(formData.get("deckId"));
  if (!id || !deckId) return;
  const nextState = fsrsCardToRow(emptyState(new Date()));
  await db.transaction((tx) => {
    tx.update(reviewState)
      .set(nextState)
      .where(eq(reviewState.cardId, id))
      .run();
    tx.delete(reviewLogs).where(eq(reviewLogs.cardId, id)).run();
  });
  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/");
  revalidatePath("/stats");
}

export async function resetDeckProgress(formData: FormData) {
  const deckId = String(formData.get("deckId"));
  if (!deckId) return;
  const deckIds = await getDeckAndDescendantIds(deckId);
  const cardRows = await db
    .select({ id: cards.id })
    .from(cards)
    .where(inArray(cards.deckId, deckIds));
  const cardIds = cardRows.map((card) => card.id);
  if (cardIds.length === 0) return;

  const nextState = fsrsCardToRow(emptyState(new Date()));
  await db.transaction((tx) => {
    tx.update(reviewState)
      .set(nextState)
      .where(inArray(reviewState.cardId, cardIds))
      .run();
    tx.delete(reviewLogs).where(inArray(reviewLogs.cardId, cardIds)).run();
  });
  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/");
  revalidatePath("/stats");
}

/** Bulk-create cards from pasted delimited text, each with fresh FSRS state. */
export async function importCards(formData: FormData) {
  const deckId = String(formData.get("deckId"));
  const text = String(formData.get("text") ?? "");
  const separator = String(formData.get("separator") ?? "tab") as SeparatorKey;
  if (!deckId) return;

  const parsed = parseCards(text, separator);
  if (parsed.length === 0) return;

  const now = Date.now();
  db.transaction((tx) => {
    for (const { front, back } of parsed) {
      const id = nanoid();
      tx.insert(cards)
        .values({ id, deckId, front, back, createdAt: now, updatedAt: now })
        .run();
      tx.insert(reviewState)
        .values({ cardId: id, ...fsrsCardToRow(emptyState(new Date(now))) })
        .run();
    }
  });

  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/");
  redirect(`/decks/${deckId}`);
}

// Review grading lives in a route handler (src/app/api/review) rather than a
// Server Action, so it doesn't refresh the review route mid-session. See
// src/lib/review.ts.
