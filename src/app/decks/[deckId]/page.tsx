import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeckLabel, getDeckView, now, studiedWhen } from "@/lib/queries";
import { renameDeck, deleteDeck } from "@/lib/actions";
import { cardMark } from "@/lib/status";
import Icon from "@/components/Icon";
import ConfirmDelete from "@/components/ConfirmDelete";
import RenameField from "@/components/RenameField";
import TopicTable, { type TopicRow } from "@/components/TopicTable";
import { Figures } from "@/components/Figures";
import { MemoryBar, MemoryLabels } from "@/components/Marks";
import { plural } from "@/components/Cells";

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
    reason: topic.counts.reason,
    marks: (marks.get(topic.id) ?? []).map((card) => cardMark(card, at)),
    lastStudied: topic.counts.lastStudied,
    when: topic.counts.lastStudied === null ? "Never" : capitalise(studiedWhen(topic.counts.lastStudied, at)),
  }));
  const topicsWithDue = topics.filter((topic) => topic.counts.due > 0).length;

  /* What changes the deck, beside the list it changes — and away from Study,
     which keeps the heading to itself. */
  const tools = (
    <ConfirmDelete
      label="Delete deck"
      action={deleteDeck}
      fields={{ id: deck.id }}
      confirm={
        <>
          Delete <strong>{deck.name}</strong>
          {counts.cards > 0 ? ` and its ${plural(counts.cards, "card")}?` : "?"}
        </>
      }
    >
      <Link href={`/import?deck=${deck.id}`} className="btn btn--ghost">
        <Icon name="plus" />
        Add cards
      </Link>
    </ConfirmDelete>
  );

  return (
    <>
      <section className="panel" aria-labelledby="deck-title">
        <div className="head">
          <div className="head__main">
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link href="/">Library</Link>
              <span className="crumbs__sep" aria-hidden="true">
                /
              </span>
            </nav>
            <h1 className="title" id="deck-title">
              <RenameField action={renameDeck} id={deck.id} name={deck.name} />
            </h1>
          </div>
          <div className="head__side">
            <p className="meta">
              {plural(topics.length, "topic")} · {plural(counts.cards, "card")}
            </p>
            {counts.cards > 0 && (
              <Link href={`/decks/${deck.id}/study`} className="btn btn--primary">
                <Icon name="play" className="icon--fill" />
                Study deck
              </Link>
            )}
          </div>
        </div>

        {counts.cards > 0 && (
          <Figures
            label={`${deck.name} overview`}
            counts={counts}
            dueCaption={
              counts.due === 0 ? "nothing waiting" : `across ${plural(topicsWithDue, "topic")}`
            }
          />
        )}
      </section>

      {counts.cards > 0 && (
        <section className="panel" aria-labelledby="memory-title">
          <div className="section-head">
            <h2 className="section-title" id="memory-title">
              Memory
            </h2>
            <span className="meta">{plural(counts.cards, "card")}</span>
          </div>
          <MemoryBar memory={counts.memory} />
          <MemoryLabels memory={counts.memory} />
        </section>
      )}

      <section className="panel" aria-labelledby="topics-title">
        {rows.length === 0 ? (
          <>
            <div className="section-head">
              <h2 className="section-title" id="topics-title">
                Topics
              </h2>
              <div className="section-tools">{tools}</div>
            </div>
            <div className="empty">
              <h2>No topics yet</h2>
              <p>Import a paste into this deck and name the topic it belongs to.</p>
              <Link href={`/import?deck=${deck.id}`} className="btn btn--primary">
                <Icon name="plus" />
                Add cards
              </Link>
            </div>
          </>
        ) : (
          <TopicTable topics={rows} tools={tools} />
        )}
      </section>
    </>
  );
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
