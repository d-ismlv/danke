import {
  markSegments,
  statusLabel,
  MARK_LABEL,
  MATURE_DAYS,
  type CardMark,
  type LearningStatus,
  type MemoryState,
} from "@/lib/status";

/**
 * The coloured marks, in one file, so the reading of a colour cannot drift
 * between the screens that draw them.
 */

const MEMORY_ORDER: MemoryState[] = ["mature", "young", "learning", "unseen"];

/** How a deck or topic is going: a shape and a colour, never colour alone. */
export function StatusMark({ status }: { status: LearningStatus }) {
  const label = statusLabel(status);
  if (status === "struggling") {
    // A triangle, drawn rather than clipped, so its corners are as soft as
    // every other shape in the app.
    return (
      <svg viewBox="0 0 12 12" className="status status--struggling" role="img" aria-label={label}>
        <title>{label}</title>
        <path d="M6 2 10.4 10H1.6Z" />
      </svg>
    );
  }
  return (
    <i className={status === "new" ? "status" : `status status--${status}`} title={label}>
      <span className="sr-only">{label}</span>
    </i>
  );
}

/** The class that paints one segment of the bar. Unseen is the bare track. */
function segClass(mark: CardMark): string | undefined {
  return mark === "unseen" ? undefined : `seg-${mark}`;
}

/**
 * The memory of a collection as the one bar: a segment per state, as wide as
 * its share. A collection with no cards is an empty track, not a hole.
 */
export function MemoryBar({
  memory,
  className,
}: {
  memory: Record<MemoryState, number>;
  className?: string;
}) {
  const parts = MEMORY_ORDER.filter((state) => memory[state] > 0);
  return (
    <span
      className={className ? `bar ${className}` : "bar"}
      role="img"
      aria-label={describeMemory(memory)}
    >
      {parts.length === 0 ? (
        <i />
      ) : (
        parts.map((state) => (
          <i key={state} className={segClass(state)} style={{ flexGrow: memory[state] }} />
        ))
      )}
    </span>
  );
}

const MEMORY_NOTE: Record<MemoryState, string> = {
  mature: `stable ${MATURE_DAYS} days or more`,
  young: "graduated, still settling",
  learning: "in steps",
  unseen: "never answered",
};

/**
 * The memory bar's key, each label under the segment it names. `detailed`
 * adds each state's share and a line on what it means, for the one page that
 * is about exactly that.
 */
export function MemoryLabels({
  memory,
  detailed = false,
}: {
  memory: Record<MemoryState, number>;
  detailed?: boolean;
}) {
  const parts = MEMORY_ORDER.filter((state) => memory[state] > 0);
  const total = parts.reduce((sum, state) => sum + memory[state], 0);
  return (
    <div className="bar-labels" aria-hidden="true">
      {parts.map((state) => (
        <span key={state} className="bar-label" style={{ flexGrow: memory[state] }}>
          <span className="bar-label__name">
            <i className={`dot dot--${state}`} />
            {MARK_LABEL[state]}
            <span className="bar-label__count">
              {memory[state]}
              {detailed && ` · ${Math.round((memory[state] / total) * 100)}%`}
            </span>
          </span>
          {detailed && <span className="bar-label__note">{MEMORY_NOTE[state]}</span>}
        </span>
      ))}
    </div>
  );
}

/**
 * A topic's cards, one segment each, in their order — until there are more
 * than fit, when a segment stands for a share of them instead.
 */
export function MarkBar({
  marks,
  max = 40,
  className,
}: {
  marks: CardMark[];
  max?: number;
  className?: string;
}) {
  const shown = markSegments(marks, max);
  return (
    // The label counts the cards, not the segments: over the limit a segment
    // stands for several, and it is the real tally that should be read out.
    <span className={className ? `bar ${className}` : "bar"} role="img" aria-label={describe(marks)}>
      {shown.length === 0 ? <i /> : shown.map((mark, i) => <i key={i} className={segClass(mark)} />)}
    </span>
  );
}

/** "Eight mature, thirteen young and five unseen" — the marks, said out loud. */
export function describe(marks: CardMark[]): string {
  const tally: Partial<Record<CardMark, number>> = {};
  for (const mark of marks) tally[mark] = (tally[mark] ?? 0) + 1;
  return sentence(tally);
}

function describeMemory(memory: Record<MemoryState, number>): string {
  return sentence(memory);
}

function sentence(tally: Partial<Record<CardMark, number>>): string {
  const order: CardMark[] = ["mature", "young", "learning", "due", "unseen"];
  const parts = order
    .filter((mark) => (tally[mark] ?? 0) > 0)
    .map((mark) => `${tally[mark]} ${MARK_LABEL[mark].toLowerCase()}`);
  if (parts.length === 0) return "No cards";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** The small key that teaches the status shapes, under the list that uses them. */
export function StatusLegend() {
  const all: LearningStatus[] = ["strong", "learning", "struggling", "new"];
  return (
    <div className="legend" aria-hidden="true">
      {all.map((status) => (
        <span key={status}>
          <StatusMark status={status} />
          {statusLabel(status)}
        </span>
      ))}
    </div>
  );
}

/** The small key that teaches the segment colours. */
export function MarkLegend({ marks }: { marks: CardMark[] }) {
  return (
    <div className="legend" aria-hidden="true">
      {marks.map((mark) => (
        <span key={mark}>
          <i className={`dot dot--${mark}`} />
          {MARK_LABEL[mark]}
        </span>
      ))}
    </div>
  );
}

/** A card's state as a pill: the word, with its colour beside it. */
export function MarkPill({ mark }: { mark: CardMark }) {
  return (
    <span className={`pill pill--${mark}`}>
      <i className={`dot dot--${mark}`} />
      {MARK_LABEL[mark]}
    </span>
  );
}
