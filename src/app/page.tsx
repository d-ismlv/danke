import Link from "next/link";
import { getLibrary, now } from "@/lib/queries";
import Icon from "@/components/Icon";
import { DueCell, LearnedBar, Waiting, plural } from "@/components/Cells";
import RowNote from "@/components/RowNote";

export const dynamic = "force-dynamic";
/* Spelled out rather than left to the root template: Next applies a layout's
   title template to that layout's *children*, and the root page is not one. */
export const metadata = { title: "danke — Library" };

/**
 * What is waiting and the button that studies it, then the decks.
 *
 * There is one study button and it studies everything, because there is one
 * session behaviour — due cards first, then unseen, then the rest. How the
 * library is going in detail is Progress's job, not this screen's.
 */
export default async function Library() {
  const at = now();
  const { decks, totals } = await getLibrary(at);
  const topicCount = decks.reduce((sum, deck) => sum + deck.topicCount, 0);

  return (
    <>
      <section className="panel" aria-labelledby="library-title">
        <div className="head">
          <div className="head__main">
            <p className="eyebrow">
              {plural(decks.length, "deck")} · {plural(topicCount, "topic")} ·{" "}
              {plural(totals.cards, "card")}
            </p>
            <h1 className="title" id="library-title">
              Library
            </h1>
          </div>
          {totals.cards > 0 && (
            <div className="head__side">
              <Waiting due={totals.due} unseen={totals.memory.unseen} />
              <Link href="/study" className="btn btn--primary">
                <Icon name="play" className="icon--fill" />
                Start review
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="panel" aria-labelledby="decks-title">
        <div className="section-head">
          <h2 className="section-title" id="decks-title">
            Decks
          </h2>
        </div>

        {decks.length === 0 ? (
          <div className="empty">
            <h2>Nothing here yet</h2>
            <p>
              Cards live in a topic, and a topic lives in a deck. Importing your first paste
              creates both.
            </p>
            <Link href="/import" className="btn btn--primary">
              <Icon name="plus" />
              Add cards
            </Link>
          </div>
        ) : (
          <div className="table t-rows">
            <div className="table__inner">
              <div className="table__head" aria-hidden="true">
                <span className="c-bar">Learned</span>
              </div>
              <div className="table__body">
                {decks.map((deck) => (
                  <Link key={deck.id} href={`/decks/${deck.id}`} className="table__row">
                    <span className="cell-name">
                      <strong className="row-name">{deck.name}</strong>
                      <small className="row-sub">
                        <RowNote
                          counts={deck.counts}
                          at={at}
                          size={plural(deck.topicCount, "topic")}
                        />
                      </small>
                    </span>
                    <LearnedBar
                      learned={deck.counts.learned}
                      cards={deck.counts.cards}
                      className="c-bar"
                    />
                    <span className="cell-num c-pct">{deck.counts.percent}%</span>
                    <DueCell due={deck.counts.due} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
