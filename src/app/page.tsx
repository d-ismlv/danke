import Link from "next/link";
import { getLibrary, now } from "@/lib/queries";
import Icon from "@/components/Icon";
import { MemoryBar, MemoryLabels, StatusLegend, StatusMark } from "@/components/Marks";
import { Figures } from "@/components/Figures";
import { DueCell, NumCell, plural } from "@/components/Cells";
import RowNote from "@/components/RowNote";

export const dynamic = "force-dynamic";
/* Spelled out rather than left to the root template: Next applies a layout's
   title template to that layout's *children*, and the root page is not one. */
export const metadata = { title: "danke — Library" };

/**
 * The heading and its figures, the memory of everything, then the decks.
 *
 * There is one study button and it studies everything, because there is one
 * session behaviour — due cards first, then unseen, then the rest.
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
              <p className="meta">Due first, then unseen, then the rest</p>
              <Link href="/study" className="btn btn--primary">
                <Icon name="play" className="icon--fill" />
                Start review
              </Link>
            </div>
          )}
        </div>

        {totals.cards > 0 && (
          <Figures
            label="Library summary"
            counts={totals}
            dueCaption="reviews whose turn has come"
          />
        )}
      </section>

      {totals.cards > 0 && (
        <section className="panel" aria-labelledby="memory-title">
          <div className="section-head">
            <h2 className="section-title" id="memory-title">
              Memory
            </h2>
            <span className="meta">{plural(totals.cards, "card")}</span>
          </div>
          <MemoryBar memory={totals.memory} />
          <MemoryLabels memory={totals.memory} />
        </section>
      )}

      <section className="panel" aria-labelledby="decks-title">
        <div className="section-head">
          <h2 className="section-title" id="decks-title">
            Decks
          </h2>
          {decks.length > 0 && (
            <Link href="/import" className="btn btn--ghost flush-end">
              <Icon name="plus" />
              Add cards
            </Link>
          )}
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
          <>
            <div className="table t-decks">
              <div className="table__inner">
                <div className="table__head" aria-hidden="true">
                  <span className="cell-name">Deck</span>
                  <span className="c-bar">Memory</span>
                  <span className="cell-num">Learned</span>
                  <span className="cell-num">Due</span>
                  <span className="cell-num">Unseen</span>
                  <span className="cell-num">Topics</span>
                  <span className="cell-num">Cards</span>
                </div>
                <div className="table__body">
                  {decks.map((deck) => (
                    <Link key={deck.id} href={`/decks/${deck.id}`} className="table__row">
                      <span className="cell-name">
                        <StatusMark status={deck.counts.status} />
                        <span>
                          <strong className="row-name">{deck.name}</strong>
                          <small className="row-sub">
                            <RowNote counts={deck.counts} at={at} />
                          </small>
                        </span>
                      </span>
                      <MemoryBar memory={deck.counts.memory} className="c-bar" />
                      <span className="cell-num">{deck.counts.percent}%</span>
                      <DueCell due={deck.counts.due} />
                      <NumCell n={deck.counts.memory.unseen} />
                      <span className="cell-num cell-num--quiet">{deck.topicCount}</span>
                      <span className="cell-num cell-num--quiet">{deck.counts.cards}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <StatusLegend />
          </>
        )}
      </section>
    </>
  );
}
