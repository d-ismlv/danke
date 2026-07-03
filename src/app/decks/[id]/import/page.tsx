import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeck } from "@/lib/queries";
import ImportForm from "@/components/ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deck = await getDeck(id);
  if (!deck) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href={`/decks/${deck.id}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {deck.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Import cards</h1>
        <p className="mt-1 text-sm text-muted">
          Paste tab-separated text (e.g. an Anki export) or pick another
          delimiter. Markdown works inside each field.
        </p>
      </div>
      <ImportForm deckId={deck.id} />
    </div>
  );
}
