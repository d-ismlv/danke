import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeck, getCardsForDeck, serverNow } from "@/lib/queries";
import { deleteCard, deleteDeck, renameDeck } from "@/lib/actions";
import Markdown from "@/components/Markdown";
import { State } from "@/lib/fsrs";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

export const dynamic = "force-dynamic";

const STATE_LABEL: Record<number, string> = {
  [State.New]: "New",
  [State.Learning]: "Learning",
  [State.Review]: "Review",
  [State.Relearning]: "Relearning",
};

export default async function DeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deck = await getDeck(id);
  if (!deck) notFound();

  const cards = await getCardsForDeck(id);
  const now = serverNow();
  const dueCount = cards.filter((c) => c.due !== null && c.due <= now).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← Decks
          </Link>
          <p className="eyebrow mt-6">Deck</p>
          <form action={renameDeck} className="mt-1 flex items-center gap-2">
            <input type="hidden" name="id" value={deck.id} />
            <input
              name="name"
              defaultValue={deck.name}
              aria-label="Deck name"
              className="display-title w-full rounded-lg border border-transparent bg-transparent py-1 text-4xl outline-none hover:border-border focus:border-accent sm:text-5xl"
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
        <div className="panel px-6 py-14 text-center">
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
        <ul className="panel divide-y divide-border overflow-hidden">
          {cards.map((c) => {
            const due = c.due !== null && c.due <= now;
            return (
              <li
                key={c.id}
                className="group flex items-start gap-4 px-4 py-5 transition hover:bg-surface-2/50 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-3 text-sm leading-6">
                    <Markdown variant="compact">
                      {c.front || "*(empty front)*"}
                    </Markdown>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <span
                      className={
                        due
                          ? "rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent"
                          : "rounded-full bg-surface-2 px-2 py-0.5"
                      }
                    >
                      {STATE_LABEL[c.state ?? State.New] ?? "New"}
                    </span>
                    {due && <span>due now</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link
                    href={`/decks/${deck.id}/cards/${c.id}`}
                    className="button-quiet min-h-9 px-2.5"
                  >
                    Edit
                  </Link>
                  <form action={deleteCard}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="deckId" value={deck.id} />
                    <ConfirmSubmitButton
                      message="Delete this card? Its review history will also be removed."
                      className="button-danger min-h-9 px-2.5"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        action={deleteDeck}
        className="mt-2 flex items-center justify-between border-t border-border pt-5 text-sm text-muted"
      >
        <input type="hidden" name="id" value={deck.id} />
        <span>Deck settings</span>
        <ConfirmSubmitButton
          message={`Delete “${deck.name}” and all of its cards? This cannot be undone.`}
          className="button-danger min-h-9"
        >
          Delete deck
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
