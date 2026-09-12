import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDeck,
  getCardsForDeck,
  getDeckAndDescendantIds,
  serverNow,
} from "@/lib/queries";
import { countLadderCardsInDecks, RUNG_NAMES } from "@/lib/ladder";
import { deleteDeck, renameDeck, resetDeckProgress } from "@/lib/actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import CardBrowser from "@/components/CardBrowser";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

/** The gradually-harder pass: the same deck read at one altitude at a time. */
const BANDS = [
  { label: "1–2", rungs: "1-2" },
  { label: "3–5", rungs: "3-5" },
  { label: "6–7", rungs: "6-7" },
];

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
  const deckIds = await getDeckAndDescendantIds(id);
  const ladderCards = await countLadderCardsInDecks(deckIds);
  const now = serverNow();
  const dueCount = cards.filter((c) => c.due !== null && c.due <= now).length;

  return (
    <div className="flex flex-col gap-6">
      {(status.created === "1" || status.updated === "1") && (
        <div
          role="status"
          className="anim-settle flex items-center gap-2 rounded-xl border border-good/25 bg-good-tint px-4 py-3 text-sm font-medium text-good"
        >
          <Icon name="check" size={16} />
          {status.created === "1" ? "Card added." : "Changes saved."}
        </div>
      )}

      <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <Link
            href="/"
            className="transition-state flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
          >
            <Icon name="arrowLeft" size={15} />
            Decks
          </Link>
          <p className="eyebrow mt-4">Deck</p>
          <form action={renameDeck} className="mt-1 flex items-center gap-2">
            <input type="hidden" name="id" value={deck.id} />
            <input
              name="name"
              defaultValue={deck.name}
              aria-label="Deck name"
              className="display-title transition-state w-full rounded-lg border border-transparent bg-transparent py-1 text-3xl outline-none hover:border-border focus:border-accent sm:text-4xl"
            />
          </form>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <Icon name="cards" size={14} />
              {cards.length} card{cards.length === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="clock" size={14} />
              {dueCount} due
            </span>
            {ladderCards > 0 && (
              <span className="flex items-center gap-1.5">
                <Icon name="ladder" size={14} />
                {ladderCards} ladder card{ladderCards === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dueCount > 0 && (
            <Link href={`/decks/${deck.id}/review`} className="button-primary">
              <Icon name="play" size={14} />
              Review {dueCount}
            </Link>
          )}
          {cards.length > 0 && (
            <Link href={`/decks/${deck.id}/review?mode=practice`} className="button-secondary">
              <Icon name="practice" size={14} />
              Practice all
            </Link>
          )}
          <Link href={`/decks/${deck.id}/import`} className="button-secondary">
            <Icon name="import" size={14} />
            Import
          </Link>
          <Link href={`/decks/${deck.id}/cards/new`} className="button-secondary">
            <Icon name="plus" size={14} />
            Card
          </Link>
        </div>
      </div>

      {ladderCards > 0 && (
        <div className="panel flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-accent-tint text-accent">
              <Icon name="ladder" size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold">Band pass</p>
              <p className="text-xs text-muted">
                Due cards at one altitude across every concept here
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            {BANDS.map((band) => (
              <Link
                key={band.rungs}
                href={`/decks/${deck.id}/review?rungs=${band.rungs}`}
                title={`Rungs ${band.label}: ${RUNG_NAMES[Number(band.rungs.split("-")[0])]} onward`}
                className="button-secondary min-h-8 px-3 py-1 text-xs"
              >
                Rungs {band.label}
              </Link>
            ))}
            <Link href="/edge" className="button-quiet min-h-8 px-2.5 py-1 text-xs">
              Edge map
              <Icon name="arrowRight" size={13} />
            </Link>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="panel px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-accent-tint text-accent">
            <Icon name="plus" size={22} />
          </div>
          <h2 className="text-lg font-semibold">This deck is still empty</h2>
          <p className="mt-1 text-pretty text-sm text-muted">
            Add a thought, image, definition, or question to begin.
          </p>
          <Link href={`/decks/${deck.id}/cards/new`} className="button-primary mt-5">
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
                <Icon name="reset" size={14} />
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
              <Icon name="trash" size={14} />
              Delete deck
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
