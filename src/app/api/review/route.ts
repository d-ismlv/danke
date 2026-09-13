import { NextResponse } from "next/server";
import { applyReview } from "@/lib/review";
import { isAuthed } from "@/lib/auth";
import { Rating, type Grade } from "@/lib/fsrs";

const VALID: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

export async function POST(req: Request) {
  // The proxy turns anonymous traffic away already; this is the belt to its
  // braces, so one edit to a matcher regex cannot open the write path.
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const cardId = body?.cardId;
  const rating = body?.rating;

  if (typeof cardId !== "string" || !VALID.includes(rating)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const result = await applyReview(cardId, rating as Grade);
  if (!result) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
