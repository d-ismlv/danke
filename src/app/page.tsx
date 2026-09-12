import Link from "next/link";
import { getDeckTree, getAllDecks } from "@/lib/queries";
import { countLadderCards } from "@/lib/ladder";
import NewDeckForm from "@/components/NewDeckForm";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [tree, allDecks, ladderCards] = await Promise.all([
    getDeckTree(),
    getAllDecks(),
    countLadderCards(),
  ]);
  const totalDue = tree.reduce((n, d) => n + (d.depth === 0 ? d.due : 0), 0);
  const totalCards = tree.reduce((n, d) => n + (d.depth === 0 ? d.total : 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Library</p>
          <h1 className="display-title text-2xl sm:text-3xl">Your decks</h1>
          <p className="mt-2 max-w-xl text-pretty text-sm leading-6 text-muted">
            {totalDue > 0
              ? `${totalDue} card${totalDue === 1 ? "" : "s"} ready for a quick review.`
              : "Nothing is waiting. Enjoy the quiet moment."}
          </p>
        </div>
        <dl className="flex items-end gap-6">
          <div className="text-right">
            <dd className="display-title numeral text-2xl text-accent">{totalDue}</dd>
            <dt className="label mt-1">Due now</dt>
          </div>
          <div className="hidden text-right sm:block">
            <dd className="display-title numeral text-2xl">{totalCards}</dd>
            <dt className="label mt-1">Cards</dt>
          </div>
        </dl>
      </header>

      {ladderCards > 0 && (
        <Link
          href="/edge"
          className="panel transition-state flex items-center gap-3 px-4 py-3 hover:border-accent-tint-border hover:bg-accent-tint/40 sm:px-5"
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-accent-tint text-accent">
            <Icon name="ladder" size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Edge map</span>
            <span className="block truncate text-xs text-muted">
              {ladderCards} ladder card{ladderCards === 1 ? "" : "s"} — where each
              concept stops
            </span>
          </span>
          <Icon name="arrowRight" size={18} />
        </Link>
      )}

      {tree.length === 0 ? (
        <div className="panel px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-accent-tint text-accent">
            <Icon name="sparkle" size={22} />
          </div>
          <h2 className="text-lg font-semibold">Start a small collection</h2>
          <p className="mt-1 text-pretty text-sm text-muted">
            Create a deck, then add your first idea below.
          </p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <ul className="divide-y divide-border">
            {tree.map((deck) => (
              <li key={deck.id}>
                <div
                  className="row group flex min-h-[4.25rem] items-center gap-3 py-3 pr-4 sm:pr-5"
                  style={{ paddingLeft: `calc(1.25rem + ${deck.depth * 1.5}rem)` }}
                >
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      deck.due > 0 ? "bg-accent" : "bg-border-strong"
                    }`}
                    aria-hidden="true"
                  />
                  <Link href={`/decks/${deck.id}`} className="min-w-0 flex-1">
                    <span className="transition-state block truncate font-semibold group-hover:text-accent">
                      {deck.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <Icon name="cards" size={13} />
                      {deck.total} card{deck.total === 1 ? "" : "s"}
                    </span>
                  </Link>

                  {deck.due > 0 ? (
                    <span className="chip chip-accent">
                      <Icon name="clock" size={12} />
                      {deck.due} due
                    </span>
                  ) : (
                    <span className="hidden items-center gap-1 text-xs text-muted sm:flex">
                      <Icon name="check" size={13} />
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
                    {deck.due > 0 ? (
                      <>
                        <Icon name="play" size={14} />
                        Review
                      </>
                    ) : deck.total > 0 ? (
                      <>
                        <Icon name="practice" size={14} />
                        <span className="hidden sm:inline">Practice</span>
                      </>
                    ) : (
                      "Empty"
                    )}
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
