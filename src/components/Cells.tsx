/* The small pieces a list row is made of, shared by the server-rendered
   library and the client-sorted topic table. Nothing here may import from the
   database side, or it would follow a row into the browser bundle. */

/**
 * What is due, said in the accent — the one coloured word in a row. Nothing
 * at all when nothing is: an empty cell lets the rows that do have work
 * stand out, where a column of dashes would give every row something.
 */
export function DueCell({ due }: { due: number }) {
  return (
    <span className="cell-due c-due">
      {due > 0 && (
        <>
          <strong>{due}</strong> due
        </>
      )}
    </span>
  );
}

/**
 * What is waiting in a scope, in one line beside its Study button: the due
 * count in the accent, then the unseen, then nothing else. This is the figure
 * a screen leads with; everything else about how a scope is going lives on
 * Progress.
 */
export function Waiting({ due, unseen }: { due: number; unseen: number }) {
  if (due === 0 && unseen === 0) return <p className="waiting">Nothing waiting</p>;
  return (
    <p className="waiting">
      {due > 0 && <strong className="waiting__due">{due} due</strong>}
      {due > 0 && unseen > 0 && <span className="waiting__sep"> · </span>}
      {unseen > 0 && `${unseen} new`}
    </p>
  );
}

/**
 * How much of a scope is learned, as the one bar in a single tone: a list
 * row's quiet second reading, never its first.
 */
export function LearnedBar({
  learned,
  cards,
  className,
}: {
  learned: number;
  cards: number;
  className?: string;
}) {
  return (
    <span
      className={className ? `bar bar--learned ${className}` : "bar bar--learned"}
      role="img"
      aria-label={`${learned} of ${cards} learned`}
    >
      {learned > 0 && <i className="seg-young" style={{ flexGrow: learned }} />}
      {cards > learned && <i style={{ flexGrow: cards - learned }} />}
      {cards === 0 && <i />}
    </span>
  );
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
