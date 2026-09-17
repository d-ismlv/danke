import { getDeckOptions } from "@/lib/queries";
import ImportForm from "@/components/ImportForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import" };

/** The one way content enters the app. Choosing where it goes and checking what
 * it says happen on the same screen, before anything is written. */
export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string; topic?: string }>;
}) {
  const [{ deck, topic }, decks] = await Promise.all([searchParams, getDeckOptions()]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* No crumb: this is a nav destination, like Progress, and the header's
          logo is the way back. Crumbs are for going up the library. */}
      <header className="flex flex-col gap-3">
        <h1 className="h-page">Import cards</h1>
        <p className="max-w-xl text-sm text-muted text-pretty">
          Pick where the cards belong, paste them, and check the preview. Nothing is written
          until every line is valid.
        </p>
      </header>
      <ImportForm decks={decks} initialDeck={deck} initialTopic={topic} />
    </div>
  );
}
