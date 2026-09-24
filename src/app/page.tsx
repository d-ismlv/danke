import Link from "next/link";
import { getLibrary, getStreak, now } from "@/lib/queries";
import Icon from "@/components/Icon";
import { StatusMark, SegmentTrack, MarkLegend, WaitingFigure } from "@/components/Marks";
import { statusLabel } from "@/lib/status";

export const dynamic = "force-dynamic";
/* Spelled out rather than left to the root template: Next applies a layout's
   title template to that layout's *children*, and the root page is not one. */
export const metadata = { title: "danke — Library" };

/**
 * One row of facts, one row of figures, then the decks.
 *
 * There is one study button and it studies everything, because there is one
 * session behaviour — due cards first, then unseen, then the rest.
 */
export default async function Library() {
  const at = now();
  const [{ decks, totals }, streak] = await Promise.all([getLibrary(at), getStreak(at)]);

  return (
    <section aria-labelledby="library-title">
      <header className="page-heading">
        <div className="page-heading__row">
          <h1 id="library-title">Library</h1>
          <div className="streak-note" aria-label={`${streak}-day streak`}>
            <Icon name="flame" />
            <strong>{streak}</strong>
            <span>day streak</span>
          </div>
          <p
            className={`library-due page-heading__end${
              totals.due === 0 ? " library-due--clear" : ""
            }`}
          >
            <strong>{totals.due}</strong>
            <span>card{totals.due === 1 ? "" : "s"} due</span>
            {totals.memory.unseen > 0 && <span>· {totals.memory.unseen} unseen</span>}
          </p>
          {totals.cards > 0 && (
            <Link href="/study" className="primary-action">
              <Icon name="play" />
              Start review
            </Link>
          )}
        </div>
      </header>

      {totals.cards > 0 && (
        <section className="library-summary" aria-label="Library summary">
          <div className="summary-figure">
            <strong>{totals.learned}</strong>
            <span>learned</span>
            <small>of {totals.cards} cards</small>
          </div>
          <div className="summary-figure">
            <strong>{totals.recall === null ? "—" : `${totals.recall}%`}</strong>
            <span>recall</span>
            <small>last 30 days</small>
          </div>
          <div className="summary-distribution">
            <div className="summary-distribution__head">
              <strong>Memory state</strong>
              <span>
                {totals.cards} card{totals.cards === 1 ? "" : "s"}
              </span>
            </div>
            <SegmentTrack memory={totals.memory} />
            <MarkLegend marks={["mature", "young", "learning", "unseen"]} />
          </div>
        </section>
      )}

      <section className="section-block" aria-labelledby="decks-title">
        <header className="section-heading">
          <div>
            <h2 id="decks-title">Decks</h2>
          </div>
        </header>

        {decks.length === 0 ? (
          <div className="empty-state">
            <h2>Nothing here yet</h2>
            <p>
              Cards live in a topic, and a topic lives in a deck. Importing your first paste
              creates both.
            </p>
            <Link href="/import" className="primary-action">
              <Icon name="import" />
              Import cards
            </Link>
          </div>
        ) : (
          <div className="deck-list">
            {decks.map((deck) => (
              <Link key={deck.id} href={`/decks/${deck.id}`} className="deck-row">
                <StatusMark status={deck.counts.status} />
                <span className="row-name">
                  <strong>{deck.name}</strong>
                  <small>
                    {deck.topicCount} topic{deck.topicCount === 1 ? "" : "s"} ·{" "}
                    {deck.counts.cards} card{deck.counts.cards === 1 ? "" : "s"}
                  </small>
                </span>
                <span
                  className="mini-orbit"
                  style={{ "--p": `${deck.counts.percent}%` } as React.CSSProperties}
                  aria-label={`${deck.counts.percent}% learned. ${statusLabel(deck.counts.status)}.`}
                >
                  <b>{deck.counts.percent}%</b>
                </span>
                <span className="row-figures">
                  <WaitingFigure due={deck.counts.due} unseen={deck.counts.memory.unseen} />
                  <small>{deck.counts.learned} learned</small>
                </span>
                <Icon name="arrow" className="row-arrow" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
