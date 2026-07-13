import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeck, getDueCards } from "@/lib/queries";
import { rowToFsrsCard, intervalPreviews } from "@/lib/fsrs";
import ReviewSession, { type QueueItem } from "@/components/ReviewSession";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deck = await getDeck(id);
  if (!deck) notFound();

  const now = new Date();
  const due = await getDueCards(id, now.getTime());

  const queue: QueueItem[] = due.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    previews: intervalPreviews(rowToFsrsCard(c.state), now),
  }));

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-good/10 text-2xl text-good">
          ✓
        </div>
        <p className="eyebrow">All clear</p>
        <h1 className="display-title text-4xl sm:text-5xl">Nothing due</h1>
        <p className="text-muted">No cards are due in {deck.name} right now.</p>
        <Link
          href={`/decks/${deck.id}`}
          className="button-primary mt-2"
        >
          Back to deck
        </Link>
      </div>
    );
  }

  return (
    <ReviewSession deckId={deck.id} deckName={deck.name} initialQueue={queue} />
  );
}
