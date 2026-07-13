import Link from "next/link";
import { getDeckTree, getAllDecks } from "@/lib/queries";
import NewDeckForm from "@/components/NewDeckForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [tree, allDecks] = await Promise.all([getDeckTree(), getAllDecks()]);
  const totalDue = tree.reduce((n, d) => n + (d.depth === 0 ? d.due : 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-2">Library</p>
          <h1 className="display-title text-3xl sm:text-4xl">Your decks</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            {totalDue > 0
              ? `${totalDue} card${totalDue === 1 ? "" : "s"} ready for a quick review.`
              : "Nothing is waiting. Enjoy the quiet moment."}
          </p>
        </div>
        {totalDue > 0 && (
          <div className="hidden text-right sm:block">
            <div className="display-title text-3xl text-accent">{totalDue}</div>
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
              due now
            </div>
          </div>
        )}
      </div>

      {tree.length === 0 ? (
        <div className="panel px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-surface-2 text-xl">
            ✦
          </div>
          <h2 className="text-lg font-semibold">Start a small collection</h2>
          <p className="mt-1 text-sm text-muted">
            Create a deck, then add your first idea below.
          </p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <ul className="divide-y divide-border">
            {tree.map((deck) => (
              <li key={deck.id}>
                <div
                  className="group flex min-h-[4.5rem] items-center gap-3 px-4 py-3 transition hover:bg-surface-2/55 sm:px-5"
                  style={{ paddingLeft: 20 + deck.depth * 24 }}
                >
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${
                      deck.due > 0 ? "bg-accent" : "bg-border"
                    }`}
                    aria-hidden="true"
                  />
                  <Link href={`/decks/${deck.id}`} className="min-w-0 flex-1">
                    <span className="block truncate font-semibold group-hover:text-accent">
                      {deck.name}
                    </span>
                    <span className="mt-0.5 block text-xs font-normal text-muted">
                      {deck.total} card{deck.total === 1 ? "" : "s"}
                    </span>
                  </Link>

                  {deck.due > 0 ? (
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                      {deck.due} due
                    </span>
                  ) : (
                    <span className="hidden text-xs text-muted sm:inline">
                      up to date
                    </span>
                  )}

                  <Link
                    href={
                      deck.total === 0
                        ? `/decks/${deck.id}`
                        : deck.due > 0
                          ? `/decks/${deck.id}/review`
                          : `/decks/${deck.id}/review?mode=practice`
                    }
                    aria-disabled={deck.total === 0}
                    className={
                      deck.due > 0
                        ? "button-primary min-h-9 px-3"
                        : deck.total > 0
                          ? "button-secondary min-h-9 px-3"
                          : "button-secondary pointer-events-none min-h-9 px-3 opacity-45"
                    }
                  >
                    {deck.due > 0 ? "Review" : deck.total > 0 ? "Practice" : "Empty"}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <NewDeckForm decks={allDecks} />
    </div>
  );
}
