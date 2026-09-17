import { notFound } from "next/navigation";
import { getDeckLabel } from "@/lib/queries";
import StudyScreen from "@/components/StudyScreen";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ deckId: string }> }) {
  const deck = await getDeckLabel((await params).deckId);
  if (!deck) notFound();
  return { title: `Study · ${deck.name}` };
}

export default async function StudyDeck({
  params,
  searchParams,
}: {
  params: Promise<{ deckId: string }>;
  searchParams: Promise<{ round?: string }>;
}) {
  const { deckId } = await params;
  const { round } = await searchParams;
  const deck = await getDeckLabel(deckId);
  if (!deck) notFound();

  return (
    <StudyScreen
      scope={{ kind: "deck", id: deckId }}
      what={deck.name}
      where={`${deck.topicCount} topic${deck.topicCount === 1 ? "" : "s"}`}
      backHref={`/decks/${deckId}`}
      backLabel={deck.name}
      round={Number(round) || 1}
      showTopic
    />
  );
}
