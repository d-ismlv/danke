import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeck } from "@/lib/queries";
import CardEditor from "@/components/CardEditor";

export const dynamic = "force-dynamic";

export default async function NewCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ added?: string }>;
}) {
  const { id } = await params;
  const { added } = await searchParams;
  const deck = await getDeck(id);
  if (!deck) notFound();

  return (
    <div className="flex flex-col gap-6">
      {added === "1" && (
        <div
          role="status"
          className="rounded-xl border border-good/25 bg-good/10 px-4 py-3 text-sm font-medium text-good"
        >
          Card added. Ready for the next one.
        </div>
      )}
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
