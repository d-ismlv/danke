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
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-semibold">Nothing due</h1>
        <p className="text-muted">No cards are due in {deck.name} right now.</p>
        <Link
          href={`/decks/${deck.id}`}
          className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
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
