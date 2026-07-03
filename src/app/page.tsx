import Link from "next/link";
import { getDeckTree, getAllDecks } from "@/lib/queries";
import NewDeckForm from "@/components/NewDeckForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [tree, allDecks] = await Promise.all([getDeckTree(), getAllDecks()]);
  const totalDue = tree.reduce((n, d) => n + (d.depth === 0 ? d.due : 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your decks</h1>
          <p className="text-sm text-muted">
            {totalDue > 0
              ? `${totalDue} card${totalDue === 1 ? "" : "s"} due for review`
              : "All caught up 🎉"}
          </p>
        </div>
      </div>

      {tree.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
          No decks yet. Create your first one below.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {tree.map((deck) => (
            <li key={deck.id}>
              <div
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                style={{ marginLeft: deck.depth * 20 }}
              >
                <Link
                  href={`/decks/${deck.id}`}
                  className="flex-1 truncate font-medium hover:text-accent"
                >
                  {deck.name}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {deck.total} card{deck.total === 1 ? "" : "s"}
                  </span>
                </Link>

                {deck.due > 0 ? (
                  <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
                    {deck.due} due
                  </span>
                ) : (
                  <span className="text-xs text-muted">done</span>
                )}

                <Link
                  href={`/decks/${deck.id}/review`}
                  aria-disabled={deck.due === 0}
                  className={
                    deck.due > 0
                      ? "rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg"
                      : "pointer-events-none rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-muted"
                  }
                >
                  Review
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <NewDeckForm decks={allDecks} />
    </div>
  );
}
