import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { mediaPath } from "@/lib/media";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthed())) return new NextResponse("Not found", { status: 404 });

  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);
  const filePath = asset ? mediaPath(asset.storageName) : null;
  if (!asset || !filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    /* Streamed, and measured from the file rather than from the row that
       describes it: `readFile` put a whole 10MB image in memory per request,
       and a Content-Length taken from the database is a promise about a file
       nobody just looked at — if the two ever disagree the response truncates
       or hangs. stat() is the thing that knows. */
    const stat = await fs.stat(filePath);
    const handle = await fs.open(filePath, "r");
    return new NextResponse(handle.readableWebStream() as ReadableStream, {
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(stat.size),
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error("Failed to read stored image", error);
    return new NextResponse("Not found", { status: 404 });
  }
}
