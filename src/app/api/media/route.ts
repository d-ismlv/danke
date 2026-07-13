import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import {
  MAX_IMAGE_BYTES,
  detectImageMime,
  ensureMediaDirectory,
  extensionForMime,
  safeOriginalName,
} from "@/lib/media";
import { cleanupStaleMedia } from "@/lib/media-cleanup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await cleanupStaleMedia().catch((error) =>
    console.error("Failed to clean abandoned images", error),
  );

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const upload = formData.get("file");
  if (!(upload instanceof File)) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  if (upload.size === 0) {
    return NextResponse.json({ error: "The selected image is empty." }, { status: 400 });
  }
  if (upload.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Images must be 10 MB or smaller." },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await upload.arrayBuffer());
  const mimeType = detectImageMime(bytes);
  if (!mimeType) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, WebP, or GIF image." },
      { status: 415 },
    );
  }

  const id = nanoid();
  const storageName = `${id}.${extensionForMime(mimeType)}`;
  const directory = await ensureMediaDirectory();
  const filePath = `${directory}/${storageName}`;

  try {
    await fs.writeFile(filePath, bytes, { flag: "wx" });
    await db.insert(mediaAssets).values({
      id,
      storageName,
      originalName: safeOriginalName(upload.name),
      mimeType,
      size: upload.size,
      createdAt: Date.now(),
    });
  } catch (error) {
    await fs.rm(filePath, { force: true }).catch(() => undefined);
    console.error("Failed to store uploaded image", error);
    return NextResponse.json({ error: "The image could not be saved." }, { status: 500 });
  }

  return NextResponse.json(
    {
      id,
      url: `/api/media/${id}`,
      name: safeOriginalName(upload.name),
      mimeType,
      size: upload.size,
    },
    { status: 201 },
  );
}
