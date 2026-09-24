import {
  markClass,
  markSegments,
  memorySegments,
  statusClass,
  statusLabel,
  MARK_LABEL,
  type CardMark,
  type LearningStatus,
  type MemoryState,
} from "@/lib/status";

/**
 * The coloured marks, in one file, so the reading of a colour cannot drift
 * between the three screens that draw them.
 */

/** The bar beside a deck, or the dot beside a topic. Says the same thing. */
export function StatusMark({
  status,
  shape = "bar",
}: {
  status: LearningStatus;
  shape?: "bar" | "dot";
}) {
  const base = shape === "bar" ? "deck-swatch" : "attention-dot";
  return (
    <i className={`${base} ${statusClass(status)}`.trim()} title={statusLabel(status)}>
      <span className="sr-only">{statusLabel(status)}</span>
    </i>
  );
}

/**
 * What is waiting in a deck or topic row, in one word-and-number: the reviews
 * that have come round, or failing those the cards never studied, or Clear.
 * One line, because the figures column is narrow, and in that order because a
 * review that has come round is the more pressing of the two. Clear means
 * there is nothing at all to study — an import you have not started does not
 * read as done.
 */
export function WaitingFigure({ due, unseen }: { due: number; unseen: number }) {
  if (due > 0) return <strong>{due} due</strong>;
  if (unseen > 0) return <strong className="is-unseen">{unseen} unseen</strong>;
  return <strong className="is-clear">Clear</strong>;
}

/** How many marks fit in a topic row's column and still read as marks. */
const PIP_LIMIT = 10;

/** A topic's cards, one mark each until there are too many to draw. */
export function StatePips({ marks }: { marks: CardMark[] }) {
  const shown = markSegments(marks, PIP_LIMIT);
  return (
    // The label counts the cards, not the marks: over the limit a mark stands
    // for several, and it is the real tally that should be read out.
    <span className="state-pips" aria-label={describe(marks)}>
      {shown.map((mark, i) => (
        <i key={i} className={markClass(mark)} />
      ))}
    </span>
  );
}

/** The library's distribution: one mark per card, capped and proportional. */
export function SegmentTrack({
  memory,
  max = 60,
}: {
  memory: Record<MemoryState, number>;
  max?: number;
}) {
  const segments = memorySegments(memory, max);
  return (
    <div
      className="segment-track"
      style={{ "--n": segments.length } as React.CSSProperties}
      role="img"
      aria-label={describe(segments)}
    >
      {segments.map((state, i) => (
        <i key={i} className={markClass(state)} />
      ))}
    </div>
  );
}

/** "Eight mature, thirteen young and five unseen" — the marks, said out loud. */
export function describe(marks: CardMark[]): string {
  const order: CardMark[] = ["mature", "young", "learning", "due", "unseen"];
  const tally = new Map<CardMark, number>();
  for (const mark of marks) tally.set(mark, (tally.get(mark) ?? 0) + 1);
  const parts = order
    .filter((mark) => tally.has(mark))
    .map((mark) => `${tally.get(mark)} ${MARK_LABEL[mark].toLowerCase()}`);
  if (parts.length === 0) return "No cards";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** The small legend that teaches the four colours, where they are first used. */
export function MarkLegend({
  marks,
  end = false,
}: {
  marks: CardMark[];
  end?: boolean;
}) {
  return (
    <div className={`tiny-legend${end ? " tiny-legend--end" : ""}`}>
      {marks.map((mark) => (
        <span key={mark}>
          <i className={markClass(mark)} />
          {MARK_LABEL[mark]}
        </span>
      ))}
    </div>
  );
}
