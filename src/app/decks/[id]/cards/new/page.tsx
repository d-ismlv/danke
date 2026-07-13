import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeck } from "@/lib/queries";
import CardEditor from "@/components/CardEditor";

export const dynamic = "force-dynamic";

export default async function NewCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deck = await getDeck(id);
  if (!deck) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/decks/${deck.id}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {deck.name}
        </Link>
        <p className="eyebrow mt-4">Create</p>
        <h1 className="display-title mt-1 text-3xl sm:text-4xl">New card</h1>
        <p className="mt-3 text-sm text-muted">
          Write in Markdown, or drop and paste images directly into either side.
        </p>
      </div>
      <CardEditor deckId={deck.id} />
    </div>
  );
}
