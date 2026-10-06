import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopicLabel, getTopicView, now, studiedWhen } from "@/lib/queries";
import { renameTopic, deleteTopic } from "@/lib/actions";
import { cardMark, MARK_LABEL, MATURE_DAYS } from "@/lib/status";
import Icon from "@/components/Icon";
import ConfirmButton from "@/components/ConfirmButton";
import ResetTopic from "@/components/ResetTopic";
import RenameField from "@/components/RenameField";
import CardList from "@/components/CardList";
import { Figure, Figures } from "@/components/Figures";
import { describe, MarkBar, MarkLegend } from "@/components/Marks";
import { plural } from "@/components/Cells";

export const dynamic = "force-dynamic";

/** Up to this many cards, each segment of the mastery bar is labelled. */
const LABELLED = 10;
/** Up to this many, each card is a segment of its own. */
const SEGMENTS = 48;

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }) {
  const topic = await getTopicLabel((await params).topicId);
  if (!topic) notFound();
  return { title: topic.name };
}

/** A topic is its questions. This is the only screen that shows a card's
 * answer outside a session, and the only place one can be corrected. */
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

  const marks = cards.map((card) => cardMark(card, at));
  const mature = cards.filter(
    (card) => card.state === 2 && (card.stability ?? 0) >= MATURE_DAYS,
  ).length;
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
          <div className="head__side">
            <p className="meta">
              {plural(counts.cards, "card")} · {studied}
            </p>
            <form action={deleteTopic} className="actions">
              <input type="hidden" name="id" value={topic.id} />
              <input type="hidden" name="deckId" value={deck.id} />
              <ConfirmButton
                label="Delete topic"
                confirm={
                  <>
                    Delete <strong>{topic.name}</strong>
                    {counts.cards > 0 ? ` and its ${plural(counts.cards, "card")}?` : "?"}
                  </>
                }
              >
                {counts.cards > 0 && (
                  <Link href={`/topics/${topic.id}/study`} className="btn btn--primary">
                    <Icon name="play" className="icon--fill" />
                    Study topic
                  </Link>
                )}
              </ConfirmButton>
            </form>
          </div>
        </div>

        {counts.cards > 0 && (
          <Figures
            label={`${topic.name} overview`}
            counts={counts}
            dueCaption={counts.due === 0 ? "nothing waiting" : "turn has come"}
            third={
              <Figure
                dot="mature"
                label="Mature"
                value={mature}
                unit={` / ${counts.cards}`}
                caption={`stable ${MATURE_DAYS} days or more`}
              />
            }
          />
        )}
      </section>

      {cards.length > 0 && (
        <section className="panel" aria-label={`Mastery: ${describe(marks)}`}>
          <div className="section-head">
            <h2 className="section-title">Mastery</h2>
            <span className="meta">
              {cards.length <= SEGMENTS ? "One segment per card, in order" : "Grouped by state"}
            </span>
          </div>
          {cards.length <= LABELLED ? (
            <div className="mastery" aria-hidden="true">
              {marks.map((mark, i) => (
                <div key={i} className="mastery__card">
                  <span className="bar">
                    <i className={mark === "unseen" ? undefined : `seg-${mark}`} />
                  </span>
                  <span className="mastery__label">
                    <span className="mastery__index">{String(i + 1).padStart(2, "0")}</span>
                    {MARK_LABEL[mark]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <MarkBar marks={marks} max={SEGMENTS} />
              <MarkLegend marks={["mature", "young", "learning", "due", "unseen"]} />
            </>
          )}
        </section>
      )}

      <section className="panel" aria-labelledby="cards-title">
        <div className="section-head">
          <h2 className="section-title" id="cards-title">
            Questions
          </h2>
          <div className="section-tools">
            <Link href={`/import?deck=${deck.id}&topic=${topic.id}`} className="btn btn--ghost">
              <Icon name="plus" />
              Add cards
            </Link>
            {/* A plain link, not <Link>: it is a file, and the router would try
                to render it as a page. */}
            {counts.cards > 0 && (
              <a
                href={`/topics/${topic.id}/download`}
                download
                className="btn btn--ghost"
                title="Save every card in this topic as one Markdown file"
              >
                <Icon name="export" />
                Export as Markdown
              </a>
            )}
            {/* Only once there is something to start over: on a topic nobody
                has studied it would reset nothing. */}
            {counts.reviewed > 0 && <ResetTopic id={topic.id} name={topic.name} />}
          </div>
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
      </section>
    </>
  );
}
