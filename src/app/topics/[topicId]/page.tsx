import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopicLabel, getTopicView, now, studiedWhen } from "@/lib/queries";
import { renameTopic, deleteTopic } from "@/lib/actions";
import Icon from "@/components/Icon";
import ConfirmDelete from "@/components/ConfirmDelete";
import ResetTopic from "@/components/ResetTopic";
import RenameField from "@/components/RenameField";
import CardList from "@/components/CardList";
import { Waiting, plural } from "@/components/Cells";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }) {
  const topic = await getTopicLabel((await params).topicId);
  if (!topic) notFound();
  return { title: topic.name };
}

/** A topic is its questions. This is the only screen that shows a card's
 * answer outside a session, and the only place one can be corrected. Each
 * question says where it stands in a word; the spread of them is Progress's. */
export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ imported?: string }>;
}) {
  const { topicId } = await params;
  const { imported } = await searchParams;
  const at = now();
  const view = await getTopicView(topicId, at);
  if (!view) notFound();
  const { topic, deck, cards, counts } = view;

  const studied = counts.lastStudied === null ? "not studied yet" : `studied ${studiedWhen(counts.lastStudied, at)}`;

  return (
    <>
      {imported && (
        <p role="status" className="notice">
          <Icon name="check" />
          {plural(Number(imported) || 0, "card")} imported.
        </p>
      )}

      <section className="panel" aria-labelledby="topic-title">
        <div className="head">
          <div className="head__main">
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link href="/">Library</Link>
              <span className="crumbs__sep" aria-hidden="true">
                /
              </span>
              <Link href={`/decks/${deck.id}`}>{deck.name}</Link>
              <span className="crumbs__sep" aria-hidden="true">
                /
              </span>
            </nav>
            <h1 className="title" id="topic-title">
              <RenameField action={renameTopic} id={topic.id} name={topic.name} />
            </h1>
          </div>
          {counts.cards > 0 && (
            <div className="head__side">
              <Waiting due={counts.due} unseen={counts.memory.unseen} />
              <Link href={`/topics/${topic.id}/study`} className="btn btn--primary">
                <Icon name="play" className="icon--fill" />
                Study topic
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="panel" aria-labelledby="cards-title">
        <div className="section-head">
          <h2 className="section-title" id="cards-title">
            Questions
          </h2>
          <span className="meta">
            {plural(counts.cards, "card")} · {studied}
          </span>
        </div>

        {cards.length === 0 ? (
          <div className="empty">
            <h2>No cards in this topic</h2>
            <p>Paste a set of questions into it and they will appear here.</p>
            <Link href={`/import?deck=${deck.id}&topic=${topic.id}`} className="btn btn--primary">
              <Icon name="plus" />
              Add cards
            </Link>
          </div>
        ) : (
          <CardList cards={cards} topicId={topic.id} at={at} />
        )}

        {/* What changes the topic, under the list it changes — and away
            from Study, which keeps the heading to itself. */}
        <div className="list-foot">
          <ConfirmDelete
            label="Delete topic"
            action={deleteTopic}
            fields={{ id: topic.id, deckId: deck.id }}
            confirm={
              <>
                Delete <strong>{topic.name}</strong>
                {counts.cards > 0 ? ` and its ${plural(counts.cards, "card")}?` : "?"}
              </>
            }
          >
            <Link href={`/import?deck=${deck.id}&topic=${topic.id}`} className="btn btn--ghost">
              <Icon name="plus" />
              Add cards
            </Link>
            {/* A plain link, not <Link>: it is a file, and the router would
                try to render it as a page. */}
            {counts.cards > 0 && (
              <a
                href={`/topics/${topic.id}/download`}
                download
                className="btn btn--ghost"
                title="Save every card in this topic as one Markdown file"
              >
                <Icon name="export" />
                Export
              </a>
            )}
            {/* Only once there is something to start over: on a topic
                nobody has studied it would reset nothing. */}
            {counts.reviewed > 0 && <ResetTopic id={topic.id} name={topic.name} />}
          </ConfirmDelete>
        </div>
      </section>
    </>
  );
}
