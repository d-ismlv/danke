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
    <section aria-labelledby="import-title">
      <header className="page-heading">
        <div className="page-heading__row">
          <h1 id="import-title">Import</h1>
        </div>
      </header>
      <ImportForm decks={decks} initialDeck={deck} initialTopic={topic} />
    </section>
  );
}
