import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeck, getDueCards, getPracticeCards } from "@/lib/queries";
import { rowToFsrsCard, intervalPreviews } from "@/lib/fsrs";
import ReviewSession, { type QueueItem } from "@/components/ReviewSession";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    mode?: string | string[];
    cardId?: string | string[];
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const deck = await getDeck(id);
  if (!deck) notFound();

  const practice = query.mode === "practice";
  const cardId = typeof query.cardId === "string" ? query.cardId : undefined;
  const now = new Date();
  const reviewCards = practice
    ? await getPracticeCards(id, cardId)
    : await getDueCards(id, now.getTime());

  const queue: QueueItem[] = reviewCards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    previews: practice
      ? {}
      : intervalPreviews(rowToFsrsCard(c.state), now),
  }));

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-good/10 text-2xl text-good">
          ✓
        </div>
        <p className="eyebrow">{practice ? "No cards" : "All clear"}</p>
        <h1 className="display-title text-3xl sm:text-4xl">
          {practice ? "Nothing to practice" : "Nothing due"}
        </h1>
        <p className="text-muted">
          {practice
            ? `No matching cards were found in ${deck.name}.`
            : `No cards are due in ${deck.name} right now.`}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {!practice && (
            <Link
              href={`/decks/${deck.id}/review?mode=practice`}
              className="button-primary"
            >
              Practice all cards
            </Link>
          )}
          <Link href={`/decks/${deck.id}`} className="button-secondary">
            Back to deck
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ReviewSession
      deckId={deck.id}
      deckName={deck.name}
      initialQueue={queue}
      practice={practice}
    />
  );
}
