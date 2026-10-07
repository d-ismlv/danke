import { MARK_LABEL, MATURE_DAYS, type MemoryState } from "@/lib/status";

/**
 * The memory bar and its key, in one file, so the reading of a colour cannot
 * drift between the screens that draw them. The memory colours appear on
 * Progress and nowhere else: the screens you study from stay in one accent.
 */

const MEMORY_ORDER: MemoryState[] = ["mature", "young", "learning", "unseen"];

/** The class that paints one segment of the bar. Unseen is the bare track. */
function segClass(mark: MemoryState): string | undefined {
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

function describeMemory(memory: Record<MemoryState, number>): string {
  const parts = MEMORY_ORDER.filter((state) => memory[state] > 0).map(
    (state) => `${memory[state]} ${MARK_LABEL[state].toLowerCase()}`,
  );
  if (parts.length === 0) return "No cards";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
