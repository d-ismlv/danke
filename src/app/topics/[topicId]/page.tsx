import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopicLabel, getTopicView, now } from "@/lib/queries";
import { renameTopic, deleteTopic } from "@/lib/actions";
import Icon from "@/components/Icon";
import Meter from "@/components/Meter";
import Crumb from "@/components/Crumb";
import ConfirmButton from "@/components/ConfirmButton";
import RenameField from "@/components/RenameField";
import CardList from "@/components/CardList";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }) {
  const topic = await getTopicLabel((await params).topicId);
  if (!topic) notFound();
  return { title: topic.name };
}

/** A topic is its cards. This is the only screen that shows a card's answer
 * outside a session, and the only place one can be corrected. */
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

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-4">
        <Crumb href={`/decks/${deck.id}`}>{deck.name}</Crumb>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <RenameField action={renameTopic} id={topic.id} name={topic.name} />
            <p className="num mt-2 text-sm text-muted">
              {counts.cards} card{counts.cards === 1 ? "" : "s"} · {counts.percent}% learned
              {counts.due > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-due">{counts.due} due</span>
                </>
              )}
            </p>
          </div>
          {counts.cards > 0 && (
            <Link href={`/topics/${topic.id}/study`} className="btn-primary btn-lg">
              <Icon name="play" size={15} />
              Study topic
            </Link>
          )}
        </div>
        <Meter percent={counts.percent} large />
      </header>

      {imported && (
        <p
          role="status"
          className="anim-fade flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft px-4 py-2.5 text-sm font-medium text-accent"
        >
          <Icon name="check" size={16} />
          {imported} card{imported === "1" ? "" : "s"} imported.
        </p>
      )}

      {cards.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">No cards in this topic</h2>
          <Link href={`/import?deck=${deck.id}&topic=${topic.id}`} className="btn-primary mt-1">
            <Icon name="import" size={15} />
            Import cards
          </Link>
        </div>
      ) : (
        <CardList cards={cards} topicId={topic.id} at={at} />
      )}

      <form action={deleteTopic} className="flex justify-end pt-2">
        <input type="hidden" name="id" value={topic.id} />
        <input type="hidden" name="deckId" value={deck.id} />
        <ConfirmButton
          label="Delete topic"
          confirm={`Delete ${topic.name} and its ${counts.cards} card${counts.cards === 1 ? "" : "s"}?`}
        />
      </form>
    </div>
  );
}
