import "server-only";

import fs from "node:fs/promises";
import { eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { cards, mediaAssets } from "@/db/schema";
import { mediaPath } from "@/lib/media";

const MEDIA_REFERENCE = /\/api\/media\/([A-Za-z0-9_-]{1,64})/g;

export function extractMediaIds(markdown: string): Set<string> {
  const ids = new Set<string>();
  for (const match of markdown.matchAll(MEDIA_REFERENCE)) ids.add(match[1]);
  return ids;
}

async function allReferencedMediaIds(): Promise<Set<string>> {
  const content = await db.select({ front: cards.front, back: cards.back }).from(cards);
  const referenced = new Set<string>();
  for (const card of content) {
    for (const id of extractMediaIds(`${card.front}\n${card.back}`)) referenced.add(id);
  }
  return referenced;
}

/** Delete candidate assets only when no saved card still references them. */
export async function cleanupUnreferencedMedia(
  candidateIds: Iterable<string>,
): Promise<void> {
  const ids = [...new Set(candidateIds)].filter((id) =>
    /^[A-Za-z0-9_-]{1,64}$/.test(id),
  );
  if (ids.length === 0) return;

  const referenced = await allReferencedMediaIds();
  const unreferenced = ids.filter((id) => !referenced.has(id));
  if (unreferenced.length === 0) return;

  const assets = await db
    .select()
    .from(mediaAssets)
    .where(inArray(mediaAssets.id, unreferenced));

  for (const asset of assets) {
    const filePath = mediaPath(asset.storageName);
    if (filePath) {
      try {
        await fs.rm(filePath, { force: true });
      } catch (error) {
        console.error(`Failed to remove unused image ${asset.id}`, error);
        continue;
      }
    }
    await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
  }
}

/** Clear abandoned uploads after a grace period, normally during a new upload. */
export async function cleanupStaleMedia(
  olderThan = Date.now() - 24 * 60 * 60 * 1000,
): Promise<void> {
  const stale = await db
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(lt(mediaAssets.createdAt, olderThan));
  await cleanupUnreferencedMedia(stale.map((asset) => asset.id));
}
