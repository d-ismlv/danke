import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeck, getCard } from "@/lib/queries";
import CardEditor from "@/components/CardEditor";

export const dynamic = "force-dynamic";

export default async function EditCardPage({
  params,
}: {
  params: Promise<{ id: string; cardId: string }>;
}) {
  const { id, cardId } = await params;
  const [deck, card] = await Promise.all([getDeck(id), getCard(cardId)]);
  if (!deck || !card || card.deckId !== deck.id) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/decks/${deck.id}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {deck.name}
        </Link>
        <p className="eyebrow mt-6">Refine</p>
        <h1 className="display-title mt-1 text-4xl sm:text-5xl">Edit card</h1>
      </div>
      <CardEditor
        deckId={deck.id}
        card={{ id: card.id, front: card.front, back: card.back }}
      />
    </div>
  );
}
