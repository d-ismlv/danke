import { studiedWhen, type Counts } from "@/lib/queries";
import { statusLabel } from "@/lib/status";

/**
 * What a deck row says under its name: how it is going — and why, when it is
 * not going well — then when it was last touched.
 */
export default function RowNote({ counts, at }: { counts: Counts; at: number }) {
  if (counts.status === "struggling") {
    return (
      <>
        <span className="row-sub__flag">{statusLabel(counts.status)}</span>
        {counts.reason && ` · ${counts.reason}`}
      </>
    );
  }
  if (counts.lastStudied === null) return <>Not started</>;
  const waiting = counts.due === 0 && counts.memory.unseen === 0 ? " · nothing waiting" : "";
  return (
    <>
      {statusLabel(counts.status)}
      {waiting} · studied {studiedWhen(counts.lastStudied, at)}
    </>
  );
}
