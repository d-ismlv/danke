import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { formatCard } from "@/lib/parse";
import { getTopicCards } from "@/lib/queries";

/**
 * A whole topic as one Markdown file, in the importer's own format: every
 * card a heading and its points, a blank line between them. It reads as an
 * ordinary document anywhere, and pasted into the importer it is the topic
 * again — the same cards, without what the scheduler knew about them.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ topicId: string }> },
) {
  // The proxy turns anonymous traffic away already; this answers with a
  // status instead of the throw `requireSession` would turn into a 500.
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const topic = await getTopicCards((await params).topicId);
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  return new Response(topic.cards.map(formatCard).join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": attachment(`${fileName(topic.name)}.md`),
      "Cache-Control": "no-store",
    },
  });
}

/** The topic's name, less the characters a file system will not take. */
function fileName(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "topic"
  );
}

/**
 * Both spellings of the name: `filename*` carries it whole, accents and all,
 * and the plain `filename` is an ASCII stand-in for anything too old to read
 * the other.
 */
function attachment(file: string): string {
  const ascii = file.replace(/[^\x20-\x7e]/g, "_");
  const encoded = encodeURIComponent(file).replace(
    /['()]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
