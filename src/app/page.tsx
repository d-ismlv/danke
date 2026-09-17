import Link from "next/link";
import { getLibrary, getStreak, now } from "@/lib/queries";
import Icon from "@/components/Icon";
import Meter from "@/components/Meter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Library" };

/**
 * The start page answers three questions in the order you ask them: can I start
 * right now, how much of this do I know, and what is in here.
 *
 * There is one study button and it studies everything, because there is one
 * session behaviour — due cards first, then unseen, then the rest. "Continue"
 * and "study everything" were never two things, and offering them as two was
 * the first decision the old home page asked for before any card appeared.
 */
export default async function Home() {
  const at = now();
  const [{ decks, totals }, streak] = await Promise.all([getLibrary(at), getStreak(at)]);
  const empty = decks.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
        <div className="panel col-span-2 flex flex-col justify-between gap-5 p-5 sm:p-7 lg:col-span-1">
          <div>
            <p className="h-section">Study</p>
            <p className="mt-2.5 text-[1.6rem] font-semibold leading-tight tracking-[-0.03em] text-pretty sm:text-[1.8rem]">
              {totals.due > 0 ? (
                <>
                  <span className="num text-due">{totals.due}</span>
                  {totals.due === 1 ? " card is" : " cards are"} due
                </>
              ) : totals.cards === 0 ? (
                "Nothing here yet"
              ) : (
                "You're all caught up"
              )}
            </p>
            <p className="mt-1.5 text-sm text-muted text-pretty">
              {totals.cards === 0
                ? "Import a topic to make your first cards."
                : totals.due > 0
                  ? "Due cards come first, then anything you haven't seen."
                  : "Keep going anyway — new and future cards are next in line."}
            </p>
          </div>
          {totals.cards === 0 ? (
            <Link href="/import" className="btn-primary btn-lg w-fit">
              <Icon name="import" size={16} />
              Import cards
            </Link>
          ) : (
            <Link href="/study" className="btn-primary btn-lg w-fit">
              <Icon name="play" size={15} />
              Study everything
            </Link>
          )}
        </div>

        <Figure label="Learned" value={`${totals.percent}%`} meter={totals.percent}>
          {totals.learned} of {totals.cards} cards
        </Figure>
        <Figure label="Streak" value={streak}>
          {streak === 0 ? "start one today" : `day${streak === 1 ? "" : "s"} in a row`}
        </Figure>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="h-section">Decks</h2>

        {empty ? (
          <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
            <h3 className="text-lg font-semibold">Your library is empty</h3>
            <p className="max-w-sm text-sm text-muted text-pretty">
              Cards live in a topic, and a topic lives in a deck. Importing your first
              paste creates both.
            </p>
            <Link href="/import" className="btn-primary mt-1">
              <Icon name="import" size={15} />
              Import cards
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <li key={deck.id}>
                <Link
                  href={`/decks/${deck.id}`}
                  className="tile group flex h-full flex-col gap-4 p-5 sm:min-h-[7.5rem]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 flex-1 text-[1.05rem] font-semibold leading-snug tracking-[-0.02em] text-pretty transition-colors group-hover:text-accent">
                      {deck.name}
                    </h3>
                    {deck.counts.due > 0 && (
                      <span className="num shrink-0 rounded-md bg-due-soft px-1.5 py-0.5 text-xs font-semibold text-due">
                        {deck.counts.due}
                        <span className="sr-only"> due</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex flex-col gap-2">
                    <div className="num flex items-baseline justify-between text-xs text-muted">
                      <span>
                        {deck.topicCount} topic{deck.topicCount === 1 ? "" : "s"} ·{" "}
                        {deck.counts.cards} card{deck.counts.cards === 1 ? "" : "s"}
                      </span>
                      <span className="font-semibold text-text">
                        {deck.counts.percent}%<span className="sr-only"> learned</span>
                      </span>
                    </div>
                    <Meter percent={deck.counts.percent} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** A number and what it counts. Two of them sit beside the study panel, and
 * they are the only figures on this page — the rest of it is the library. */
function Figure({
  label,
  value,
  meter,
  children,
}: {
  label: string;
  value: string | number;
  meter?: number;
  children: React.ReactNode;
}) {
  /* Laid out from the top, not spread to the edges: two of these sit side by
     side and only one carries a bar, so anchoring the block to the bottom left
     their figures on different lines. */
  return (
    <div className="panel flex flex-col p-5 sm:p-7">
      <p className="h-section">{label}</p>
      <p className="num mt-5 text-[1.9rem] font-semibold leading-none tracking-[-0.04em] sm:mt-7 sm:text-[2.1rem]">
        {value}
      </p>
      <p className="num mt-2 text-xs text-muted">{children}</p>
      {meter !== undefined && <Meter percent={meter} className="mt-3.5" />}
    </div>
  );
}
