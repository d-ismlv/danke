import Link from "next/link";
import { notFound } from "next/navigation";
import { getConceptLadder, getDrillCards, RUNG_NAMES } from "@/lib/ladder";
import { rowToFsrsCard, intervalPreviews } from "@/lib/fsrs";
import ReviewSession, { type QueueItem } from "@/components/ReviewSession";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ concept: string }>;
}) {
  const { concept } = await params;
  return { title: `Drill · ${decodeURIComponent(concept)}` };
}

/**
 * Drill one concept: every rung in ladder order, due dates ignored, stopping
 * at the first Again. Grading still goes through `/api/review`, so a drill
 * feeds the same FSRS schedule a review does.
 */
export default async function DrillPage({
  params,
}: {
  params: Promise<{ concept: string }>;
}) {
  const { concept } = await params;
  const conceptId = decodeURIComponent(concept);
  const [ladder, cards] = await Promise.all([
    getConceptLadder(conceptId),
    getDrillCards(conceptId),
  ]);
  if (!ladder || cards.length === 0) notFound();

  const now = new Date();
  const queue: QueueItem[] = cards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    rung: c.rung,
    previews: intervalPreviews(rowToFsrsCard(c.state), now),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
        <Link href="/edge" className="transition-state flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <Icon name="arrowLeft" size={15} />
          Edge map
        </Link>
        <span className="chip">
          {ladder.edge === null
            ? "Whole ladder standing"
            : `Edge at rung ${ladder.edge} · ${RUNG_NAMES[ladder.edge] ?? ""}`}
        </span>
      </div>
      <ReviewSession
        title={conceptId}
        subtitle={ladder.deckName}
        backHref="/edge"
        initialQueue={queue}
        mode="drill"
        conceptId={conceptId}
      />
    </div>
  );
}
