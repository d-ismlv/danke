import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeck, getCardsForDeck, serverNow } from "@/lib/queries";
import {
  deleteDeck,
  renameDeck,
  resetDeckProgress,
} from "@/lib/actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import CardBrowser from "@/components/CardBrowser";

export const dynamic = "force-dynamic";

export default async function DeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const { id } = await params;
  const status = await searchParams;
  const deck = await getDeck(id);
  if (!deck) notFound();

  const cards = await getCardsForDeck(id);
  const now = serverNow();
  const dueCount = cards.filter((c) => c.due !== null && c.due <= now).length;

  return (
    <div className="flex flex-col gap-6">
      {(status.created === "1" || status.updated === "1") && (
        <div
          role="status"
          className="rounded-xl border border-good/25 bg-good/10 px-4 py-3 text-sm font-medium text-good"
        >
          {status.created === "1" ? "Card added." : "Changes saved."}
        </div>
      )}
      <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← Decks
          </Link>
          <p className="eyebrow mt-4">Deck</p>
          <form action={renameDeck} className="mt-1 flex items-center gap-2">
            <input type="hidden" name="id" value={deck.id} />
            <input
              name="name"
              defaultValue={deck.name}
              aria-label="Deck name"
              className="display-title w-full rounded-lg border border-transparent bg-transparent py-1 text-3xl outline-none hover:border-border focus:border-accent sm:text-4xl"
            />
          </form>
          <p className="mt-2 text-sm text-muted">
            {cards.length} card{cards.length === 1 ? "" : "s"} · {dueCount} due
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dueCount > 0 && (
            <Link
              href={`/decks/${deck.id}/review`}
              className="button-primary"
            >
              Review {dueCount}
            </Link>
          )}
          {cards.length > 0 && (
            <Link
              href={`/decks/${deck.id}/review?mode=practice`}
              className="button-secondary"
            >
              Practice all
            </Link>
          )}
          <Link
            href={`/decks/${deck.id}/import`}
            className="button-secondary"
          >
            Import
          </Link>
          <Link
            href={`/decks/${deck.id}/cards/new`}
            className="button-secondary"
          >
            + Card
          </Link>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="panel px-6 py-10 text-center">
          <h2 className="text-lg font-semibold">This deck is still empty</h2>
          <p className="mt-1 text-sm text-muted">
            Add a thought, image, definition, or question to begin.
          </p>
          <Link
            href={`/decks/${deck.id}/cards/new`}
            className="button-primary mt-5"
          >
            Add the first card
          </Link>
        </div>
      ) : (
        <CardBrowser cards={cards} deckId={deck.id} now={now} />
      )}

      <div className="mt-2 flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Deck settings</span>
        <div className="flex flex-wrap gap-2">
          {cards.length > 0 && (
            <form action={resetDeckProgress}>
              <input type="hidden" name="deckId" value={deck.id} />
              <ConfirmSubmitButton
                message={`Reset progress for every card in “${deck.name}”? Review history will be removed.`}
                className="button-secondary min-h-9"
              >
                Reset progress
              </ConfirmSubmitButton>
            </form>
          )}
          <form action={deleteDeck}>
            <input type="hidden" name="id" value={deck.id} />
            <ConfirmSubmitButton
              message={`Delete “${deck.name}” and all of its cards? This cannot be undone.`}
              className="button-danger min-h-9"
            >
              Delete deck
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
