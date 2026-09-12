import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDeck,
  getDueCards,
  getPracticeCards,
  parseRungBand,
} from "@/lib/queries";
import { rowToFsrsCard, intervalPreviews } from "@/lib/fsrs";
import { RUNG_NAMES } from "@/lib/import";
import ReviewSession, { type QueueItem } from "@/components/ReviewSession";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    mode?: string | string[];
    cardId?: string | string[];
    rungs?: string | string[];
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const deck = await getDeck(id);
  if (!deck) notFound();

  const practice = query.mode === "practice";
  const cardId = typeof query.cardId === "string" ? query.cardId : undefined;
  const band = parseRungBand(query.rungs);
  const now = new Date();
  const reviewCards = practice
    ? await getPracticeCards(id, cardId, 500, band)
    : await getDueCards(id, now.getTime(), 500, band);

  const queue: QueueItem[] = reviewCards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    rung: c.rung,
    previews: practice ? {} : intervalPreviews(rowToFsrsCard(c.state), now),
  }));

  const bandLabel = band
    ? band.min === band.max
      ? `Rung ${band.min} · ${RUNG_NAMES[band.min] ?? ""}`
      : `Rungs ${band.min}–${band.max} · ${RUNG_NAMES[band.min] ?? ""} → ${RUNG_NAMES[band.max] ?? ""}`
    : undefined;

  if (queue.length === 0) {
    return (
      <div className="anim-rise mx-auto flex w-full max-w-xl flex-col items-center gap-3 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-xl bg-good-tint text-good">
          <Icon name="check" size={26} />
        </div>
        <p className="eyebrow">{practice ? "No cards" : "All clear"}</p>
        <h1 className="display-title text-3xl sm:text-4xl">
          {practice ? "Nothing to practice" : "Nothing due"}
        </h1>
        <p className="text-muted">
          {band
            ? `No ${practice ? "" : "due "}cards in ${deck.name} at ${bandLabel?.toLowerCase()}.`
            : practice
              ? `No matching cards were found in ${deck.name}.`
              : `No cards are due in ${deck.name} right now.`}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {!practice && (
            <Link
              href={`/decks/${deck.id}/review?mode=practice${band ? `&rungs=${band.min}-${band.max}` : ""}`}
              className="button-primary"
            >
              <Icon name="practice" size={15} />
              Practice {band ? "this band" : "all cards"}
            </Link>
          )}
          <Link href={`/decks/${deck.id}`} className="button-secondary">
            <Icon name="arrowLeft" size={15} />
            Back to deck
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ReviewSession
      title={deck.name}
      subtitle={bandLabel}
      backHref={`/decks/${deck.id}`}
      initialQueue={queue}
      mode={practice ? "practice" : "review"}
    />
  );
}
