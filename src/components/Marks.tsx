import {
  markClass,
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

/** One mark per card, in the order the topic holds them. */
export function StatePips({ marks }: { marks: CardMark[] }) {
  return (
    <span className="state-pips" aria-label={describe(marks)}>
      {marks.map((mark, i) => (
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
