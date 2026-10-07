import { studiedWhen, type Counts } from "@/lib/queries";
import { statusLabel } from "@/lib/status";

/**
 * What a deck row says under its name: its size and when it was last
 * touched — and, only when it is not going well, that it needs attention.
 * That is the one status a row says out loud; Strong and Learning are left to
 * Progress, so a flag stands out instead of being one label among many.
 *
 * `detailed` adds why it needs attention, for Progress, which has the room.
 */
export default function RowNote({
  counts,
  at,
  size,
  detailed = false,
}: {
  counts: Counts;
  at: number;
  /** What the row holds, said first: "6 topics", "4 cards". */
  size?: string;
  detailed?: boolean;
}) {
  const when = counts.lastStudied === null ? "not started" : `studied ${studiedWhen(counts.lastStudied, at)}`;
  if (counts.status === "struggling") {
    return (
      <>
        <span className="row-sub__flag">{statusLabel(counts.status)}</span>
        {detailed && counts.reason ? ` · ${counts.reason}` : ` · ${when}`}
      </>
    );
  }
  return <>{size ? `${size} · ${when}` : capitalise(when)}</>;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
