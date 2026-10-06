/* The small pieces a table row is made of, shared by the server-rendered
   library and the client-sorted topic table. Nothing here may import from the
   database side, or it would follow a row into the browser bundle. */

/** What is due, in the accent, or a dash when nothing is. */
export function DueCell({ due }: { due: number }) {
  if (due === 0) return <span className="cell-none c-due">—</span>;
  return (
    <span className="cell-due c-due">
      <i className="dot dot--due" />
      {due}
    </span>
  );
}

/** A count, or a dash in its place when there are none. */
export function NumCell({ n }: { n: number }) {
  return n === 0 ? <span className="cell-none">—</span> : <span className="cell-num">{n}</span>;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
