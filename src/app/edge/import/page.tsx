import Link from "next/link";
import { getAllDecks } from "@/lib/queries";
import LadderImportForm from "@/components/LadderImportForm";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function LadderImportPage() {
  const decks = await getAllDecks();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/edge"
          className="transition-state flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <Icon name="arrowLeft" size={15} />
          Edge map
        </Link>
        <p className="eyebrow mt-4">One file per concept</p>
        <h1 className="display-title mt-1 text-3xl sm:text-4xl">Import ladders</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Paste or choose concept files. Front-matter names the concept and its deck
          (created if missing); each <code className="mono">## rung :: question</code>{" "}
          heading is a card, and everything up to the next heading is its answer.
          Re-importing an edited file updates the text and keeps the review history.
        </p>
      </div>
      <LadderImportForm decks={decks} />
    </div>
  );
}
