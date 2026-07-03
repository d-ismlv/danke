import { NextResponse } from "next/server";
import { applyReview } from "@/lib/review";
import { Rating, type Grade } from "@/lib/fsrs";

const VALID: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

export async function POST(req: Request) {
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
