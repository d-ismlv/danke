import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeck } from "@/lib/queries";
import ImportForm from "@/components/ImportForm";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deck = await getDeck(id);
  return { title: `Import · ${deck?.name ?? "deck"}` };
}

export default async function ImportPage({
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
          className="transition-state flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <Icon name="arrowLeft" size={15} />
          {deck.name}
        </Link>
        <p className="eyebrow mt-4">Bring your notes</p>
        <h1 className="display-title mt-1 text-2xl sm:text-3xl">Import cards</h1>
        <p className="mt-3 max-w-xl text-pretty text-sm leading-6 text-muted">
          Paste tab-separated text (e.g. an Anki export) or pick another
          delimiter. Markdown works in each field, but a card must fit on one line.
        </p>
        <Link
          href="/edge/import"
          className="transition-state mt-3 flex w-fit items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm hover:border-accent-tint-border hover:bg-accent-tint/40"
        >
          <Icon name="ladder" size={16} />
          Importing a concept ladder instead?
          <Icon name="arrowRight" size={15} />
        </Link>
      </div>
      <ImportForm deckId={deck.id} />
    </div>
  );
}
