import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeck, getCardsForDeck, serverNow } from "@/lib/queries";
import { deleteCard, deleteDeck, renameDeck } from "@/lib/actions";
import Markdown from "@/components/Markdown";
import { State } from "@/lib/fsrs";

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 sm:flex-1">
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← Decks
          </Link>
          <form action={renameDeck} className="mt-1 flex items-center gap-2">
            <input type="hidden" name="id" value={deck.id} />
            <input
              name="name"
              defaultValue={deck.name}
              className="w-full rounded-lg border border-transparent bg-transparent px-1 text-2xl font-semibold outline-none hover:border-border focus:border-accent"
            />
          </form>
          <p className="mt-1 px-1 text-sm text-muted">
            {cards.length} card{cards.length === 1 ? "" : "s"} · {dueCount} due
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dueCount > 0 && (
            <Link
              href={`/decks/${deck.id}/review`}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
            >
              Review {dueCount}
            </Link>
          )}
          <Link
            href={`/decks/${deck.id}/import`}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2"
          >
            Import
          </Link>
          <Link
            href={`/decks/${deck.id}/cards/new`}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2"
          >
            + Card
          </Link>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
          No cards yet.{" "}
          <Link href={`/decks/${deck.id}/cards/new`} className="text-accent">
            Add your first card
          </Link>
          .
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {cards.map((c) => {
            const due = c.due !== null && c.due <= now;
            return (
              <li
                key={c.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-3 text-sm">
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
                    className="rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-foreground"
                  >
                    Edit
                  </Link>
                  <form action={deleteCard}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="deckId" value={deck.id} />
                    <button className="rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-again/10 hover:text-again">
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        action={deleteDeck}
        className="mt-4 border-t border-border pt-4 text-sm text-muted"
      >
        <input type="hidden" name="id" value={deck.id} />
        <button className="hover:text-again">Delete this deck</button>
      </form>
    </div>
  );
}
