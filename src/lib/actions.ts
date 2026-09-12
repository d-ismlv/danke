"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { decks, cards, reviewState, reviewLogs } from "@/db/schema";
import { emptyState, fsrsCardToRow } from "@/lib/fsrs";
import { parseCards, parseLadders, type SeparatorKey } from "@/lib/import";
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
  if (again) redirect(`/decks/${deckId}/cards/new?added=1`);
  redirect(`/decks/${deckId}?created=1`);
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
  redirect(`/decks/${deckId}?updated=1`);
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

// ---- Ladders ---------------------------------------------------------------

export type LadderImportState = {
  error: string | null;
  /** Problems worth showing but not worth blocking on. */
  warnings?: string[];
};

/**
 * Import one or more concept files (see `parseLadders`).
 *
 * Every card carries a `sourceKey`, and the write is an upsert on it: editing a
 * typo in a concept file and re-importing updates `front`/`back` and leaves
 * `review_state` untouched. Losing an FSRS history to a typo fix would undo the
 * point of drilling in the first place.
 */
export async function importLadders(
  _prev: LadderImportState,
  formData: FormData,
): Promise<LadderImportState> {
  const text = String(formData.get("text") ?? "");
  const fallbackDeckId = String(formData.get("deckId") ?? "") || null;

  const { ladders, errors, warnings } = parseLadders(text);
  if (errors.length > 0) {
    return { error: errors.slice(0, 4).join("  "), warnings };
  }
  if (ladders.length === 0) {
    return { error: "Nothing to import.", warnings };
  }

  const now = Date.now();
  const touchedDecks = new Set<string>();
  const replaced: { front: string; back: string }[] = [];
  let created = 0;
  let updated = 0;
  let missingDeck = false;

  db.transaction((tx) => {
    // Deck paths are created as needed: "AD / Kerberos" is a Kerberos deck
    // under an AD deck, either of which may already exist.
    const deckCache = new Map<string, string>();
    const resolveDeck = (path: string[]): string | null => {
      if (path.length === 0) return fallbackDeckId;
      let parentId: string | null = null;
      let key = "";
      for (const name of path) {
        key = key ? `${key} / ${name}` : name;
        const cached = deckCache.get(key);
        if (cached) {
          parentId = cached;
          continue;
        }
        // Annotated: inside a transaction callback the inferred type of a
        // `.get()` result loops back through the callback's own return type.
        const found: { id: string } | undefined = tx
          .select({ id: decks.id })
          .from(decks)
          .where(
            and(
              eq(decks.name, name),
              parentId === null ? isNull(decks.parentId) : eq(decks.parentId, parentId),
            ),
          )
          .limit(1)
          .get();
        let id: string | undefined = found?.id;
        if (!id) {
          id = nanoid();
          tx.insert(decks).values({ id, name, parentId, createdAt: now }).run();
        }
        deckCache.set(key, id);
        parentId = id;
      }
      return parentId;
    };

    for (const ladder of ladders) {
      const deckId = resolveDeck(ladder.deckPath);
      if (!deckId) {
        missingDeck = true;
        continue;
      }
      touchedDecks.add(deckId);

      for (const card of ladder.cards) {
        const existing: { id: string; front: string; back: string } | undefined = tx
          .select({ id: cards.id, front: cards.front, back: cards.back })
          .from(cards)
          .where(eq(cards.sourceKey, card.sourceKey))
          .limit(1)
          .get();

        if (existing) {
          if (existing.front !== card.front || existing.back !== card.back) {
            replaced.push({ front: existing.front, back: existing.back });
          }
          tx.update(cards)
            .set({
              deckId,
              front: card.front,
              back: card.back,
              conceptId: card.conceptId,
              rung: card.rung,
              updatedAt: now,
            })
            .where(eq(cards.id, existing.id))
            .run();
          updated += 1;
          continue;
        }

        const id = nanoid();
        tx.insert(cards)
          .values({
            id,
            deckId,
            front: card.front,
            back: card.back,
            conceptId: card.conceptId,
            rung: card.rung,
            sourceKey: card.sourceKey,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        tx.insert(reviewState)
          .values({ cardId: id, ...fsrsCardToRow(emptyState(new Date(now))) })
          .run();
        created += 1;
      }
    }
  });

  if (missingDeck) {
    return {
      error:
        "A concept has no deck. Add a “deck:” line to its front-matter, or import from inside a deck.",
      warnings,
    };
  }

  // An edited card may have dropped the only reference to an uploaded image.
  if (replaced.length > 0) {
    const candidates = new Set<string>();
    for (const card of replaced) {
      for (const id of extractMediaIds(`${card.front}\n${card.back}`)) candidates.add(id);
    }
    await cleanupUnreferencedMedia(candidates);
  }

  revalidatePath("/");
  revalidatePath("/edge");
  for (const deckId of touchedDecks) revalidatePath(`/decks/${deckId}`);
  redirect(`/edge?created=${created}&updated=${updated}`);
}

// Review grading lives in a route handler (src/app/api/review) rather than a
// Server Action, so it doesn't refresh the review route mid-session. See
// src/lib/review.ts.
