import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeckLabel, getDeckView, now } from "@/lib/queries";
import { renameDeck, deleteDeck } from "@/lib/actions";
import { cardMark } from "@/lib/status";
import Icon from "@/components/Icon";
import ConfirmButton from "@/components/ConfirmButton";
import RenameField from "@/components/RenameField";
import TopicTable, { type TopicRow } from "@/components/TopicTable";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ deckId: string }> }) {
  const deck = await getDeckLabel((await params).deckId);
  // Caught here rather than only in the body, so the tab is titled "Not found"
  // instead of the deck name and the body's queries never run. Next has
  // already begun streaming the shell by the time the body throws, so that
  // response is still a 200 carrying the not-found page — right content,
  // wrong status.
  if (!deck) notFound();
  return { title: deck.name };
}

/** A deck is its topics. Studying the whole deck is one button at the top;
 * studying one topic is one click into it. */
export default async function DeckPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  const at = now();
  const view = await getDeckView(deckId, at);
  if (!view) notFound();
  const { deck, topics, marks, counts } = view;

  const rows: TopicRow[] = topics.map((topic) => ({
    id: topic.id,
    name: topic.name,
    cards: topic.counts.cards,
    due: topic.counts.due,
    unseen: topic.counts.memory.unseen,
    status: topic.counts.status,
    marks: (marks.get(topic.id) ?? []).map((card) => cardMark(card, at)),
  }));

  return (
    <section aria-labelledby="deck-title">
      <header className="page-heading">
        <Link href="/" className="back-link">
          ← Library
        </Link>
        <p className="eyebrow">Deck</p>
        <div className="page-heading__row">
          <h1 id="deck-title">
            <RenameField action={renameDeck} id={deck.id} name={deck.name} />
          </h1>
          {counts.cards > 0 && (
            <Link
              href={`/decks/${deck.id}/study`}
              className="primary-action page-heading__end"
            >
              <Icon name="play" />
              Study deck
            </Link>
          )}
        </div>
      </header>

      {counts.cards > 0 && (
        <section className="deck-overview" aria-label={`${deck.name} overview`}>
          <div
            className="mastery-dial"
            style={{ "--p": `${counts.percent}%` } as React.CSSProperties}
          >
            <span>
              <strong>{counts.percent}%</strong>
              <small>learned</small>
            </span>
          </div>
          <div className="deck-overview__copy">
            <h2>
              {counts.learned} / {counts.cards} learned
            </h2>
            <dl className="deck-facts">
              <div>
                <dt>Due now</dt>
                <dd className="warm">{counts.due}</dd>
              </div>
              <div>
                <dt>Unseen</dt>
                <dd>{counts.memory.unseen}</dd>
              </div>
              <div>
                <dt>Recall</dt>
                <dd>{counts.recall === null ? "—" : `${counts.recall}%`}</dd>
              </div>
            </dl>
          </div>
        </section>
      )}

      <section className="section-block" aria-labelledby="topics-title">
        {rows.length === 0 ? (
          <>
            <header className="section-heading">
              <div>
                <h2 id="topics-title">Topics</h2>
              </div>
            </header>
            <div className="empty-state">
              <h2>No topics yet</h2>
              <p>Import a paste into this deck and name the topic it belongs to.</p>
              <Link href={`/import?deck=${deck.id}`} className="primary-action">
                <Icon name="import" />
                Import cards
              </Link>
            </div>
          </>
        ) : (
          <TopicTable topics={rows} />
        )}
      </section>

      <form action={deleteDeck} className="page-footer-action">
        <input type="hidden" name="id" value={deck.id} />
        <ConfirmButton
          label="Delete deck"
          confirm={`Delete ${deck.name} and all ${counts.cards} of its cards?`}
        />
      </form>
    </section>
  );
}
