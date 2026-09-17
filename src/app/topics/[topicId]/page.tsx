import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopicLabel, getTopicView, now } from "@/lib/queries";
import { renameTopic, deleteTopic } from "@/lib/actions";
import { cardMark, markClass, markSegments, MATURE_DAYS } from "@/lib/status";
import Icon from "@/components/Icon";
import ConfirmButton from "@/components/ConfirmButton";
import RenameField from "@/components/RenameField";
import CardList from "@/components/CardList";
import { describe } from "@/components/Marks";

export const dynamic = "force-dynamic";

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
  /* One mark per card while they still fit; past that each stands for a share.
     Two hundred of them at a two-pixel floor overran the panel and were cut
     off, which made a long topic look like a short one. */
  const segments = markSegments(marks, 48);
  const mature = cards.filter(
    (card) => card.state === 2 && (card.stability ?? 0) >= MATURE_DAYS,
  ).length;

  return (
    <section aria-labelledby="topic-title">
      <header className="page-heading">
        <Link href={`/decks/${deck.id}`} className="back-link">
          ← {deck.name}
        </Link>
        <p className="eyebrow">Topic</p>
        <div className="page-heading__row">
          <h1 id="topic-title">
            <RenameField action={renameTopic} id={topic.id} name={topic.name} />
          </h1>
          {counts.cards > 0 && (
            <Link
              href={`/topics/${topic.id}/study`}
              className="primary-action page-heading__end"
            >
              <Icon name="play" />
              Study topic
            </Link>
          )}
        </div>
      </header>

      {imported && (
        <p role="status" className="notice">
          <Icon name="check" />
          {imported} card{imported === "1" ? "" : "s"} imported.
        </p>
      )}

      {cards.length > 0 && (
        <section className="topic-progress" aria-label={describe(marks)}>
          <div className="topic-progress__head">
            <span>Mastery</span>
            <strong>
              {mature} / {counts.cards} mature
            </strong>
          </div>
          <div
            className="topic-progress__segments"
            style={{ "--n": segments.length } as React.CSSProperties}
            aria-hidden="true"
          >
            {segments.map((mark, i) => (
              <i key={i} className={markClass(mark)} />
            ))}
          </div>
        </section>
      )}

      <section className="question-section" aria-labelledby="cards-title">
        <header className="section-heading">
          <div>
            <h2 id="cards-title">Questions</h2>
          </div>
        </header>

        {cards.length === 0 ? (
          <div className="empty-state">
            <h2>No cards in this topic</h2>
            <p>Paste a set of questions into it and they will appear here.</p>
            <Link href={`/import?deck=${deck.id}&topic=${topic.id}`} className="primary-action">
              <Icon name="import" />
              Import cards
            </Link>
          </div>
        ) : (
          <CardList cards={cards} topicId={topic.id} at={at} />
        )}
      </section>

      <form action={deleteTopic} className="page-footer-action">
        <input type="hidden" name="id" value={topic.id} />
        <input type="hidden" name="deckId" value={deck.id} />
        <ConfirmButton
          label="Delete topic"
          confirm={`Delete ${topic.name} and its ${counts.cards} card${counts.cards === 1 ? "" : "s"}?`}
        />
      </form>
    </section>
  );
}
