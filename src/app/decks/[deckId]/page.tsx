import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeckLabel, getDeckView, now } from "@/lib/queries";
import { renameDeck, deleteDeck } from "@/lib/actions";
import Icon from "@/components/Icon";
import Meter from "@/components/Meter";
import Crumb from "@/components/Crumb";
import ConfirmButton from "@/components/ConfirmButton";
import RenameField from "@/components/RenameField";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ deckId: string }> }) {
  const deck = await getDeckLabel((await params).deckId);
  // Caught here rather than only in the body, so the tab is titled "Not found"
  // instead of "Deck" and the body's queries never run. Next has already begun
  // streaming the shell by this point, so the response is still a 200 carrying
  // the not-found page — right content, wrong status.
  if (!deck) notFound();
  return { title: deck.name };
}

/** A deck is its topics, as a grid. Studying the whole deck is one button at
 * the top; studying one topic is one click into it. */
export default async function DeckPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  const view = await getDeckView(deckId, now());
  if (!view) notFound();
  const { deck, topics, counts } = view;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-4">
        <Crumb href="/">Decks</Crumb>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <RenameField action={renameDeck} id={deck.id} name={deck.name} />
            <p className="num mt-2 text-sm text-muted">
              {topics.length} topic{topics.length === 1 ? "" : "s"} · {counts.cards} card
              {counts.cards === 1 ? "" : "s"} · {counts.percent}% learned
              {counts.due > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-due">{counts.due} due</span>
                </>
              )}
            </p>
          </div>
          {counts.cards > 0 && (
            <Link href={`/decks/${deck.id}/study`} className="btn-primary btn-lg">
              <Icon name="play" size={15} />
              Study deck
            </Link>
          )}
        </div>
        <Meter percent={counts.percent} large />
      </header>

      {topics.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">No topics yet</h2>
          <p className="max-w-sm text-sm text-muted text-pretty">
            Import a paste into this deck and name the topic it belongs to.
          </p>
          <Link href={`/import?deck=${deck.id}`} className="btn-primary mt-1">
            <Icon name="import" size={15} />
            Import cards
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <li key={topic.id}>
              <Link href={`/topics/${topic.id}`} className="tile group flex h-full flex-col gap-4 p-5 sm:min-h-[7.5rem]">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 flex-1 text-[1.02rem] font-semibold leading-snug tracking-[-0.02em] text-pretty transition-colors group-hover:text-accent">
                    {topic.name}
                  </h2>
                  {topic.counts.due > 0 && (
                    <span className="num shrink-0 rounded-md bg-due-soft px-1.5 py-0.5 text-xs font-semibold text-due">
                      {topic.counts.due}
                      <span className="sr-only"> due</span>
                    </span>
                  )}
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <div className="num flex items-baseline justify-between text-xs text-muted">
                    <span>
                      {topic.counts.cards} card{topic.counts.cards === 1 ? "" : "s"}
                    </span>
                    <span className="font-semibold text-text">
                      {topic.counts.percent}%<span className="sr-only"> learned</span>
                    </span>
                  </div>
                  <Meter percent={topic.counts.percent} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form action={deleteDeck} className="flex justify-end pt-2">
        <input type="hidden" name="id" value={deck.id} />
        <ConfirmButton
          label="Delete deck"
          confirm={`Delete ${deck.name} and all ${counts.cards} of its cards?`}
        />
      </form>
    </div>
  );
}
