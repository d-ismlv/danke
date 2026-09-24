/**
 * What the coloured marks mean.
 *
 * The bar beside a deck on Library, the dot beside a topic inside a deck, and
 * the bar beside a deck on Progress are the same measurement drawn three
 * times: how the cards in that scope are actually going. They are never an
 * identity colour — nothing here may be keyed to a deck's id, its name, its
 * position in a list, or anything else that does not come out of the review
 * history.
 *
 * Pure and dependency-free so the thresholds can be read, argued with and
 * tuned in one place, without opening a component.
 */

export type LearningStatus = "new" | "learning" | "struggling" | "strong";

/** The four states a card's memory can be in. They sum to the card count. */
export type MemoryState = "mature" | "young" | "learning" | "unseen";

/** What one card shows as. `due` outranks the rest: it is the thing to act on. */
export type CardMark = MemoryState | "due";

/** Stability, in days, at which a card counts as mature rather than young. */
export const MATURE_DAYS = 21;

/* The thresholds, named so the rules below read as sentences. None of them is
   sacred; they are here to be adjusted from one screen. */

/** Below this many recent answers the Again rate is noise, not a signal. */
const STRUGGLING_MIN_ANSWERS = 5;
/** Failing this often over the trailing window is the scope going backwards. */
const STRUGGLING_AGAIN_SHARE = 0.3;
/** Or this much of what has been seen is relearning or repeatedly lapsed. */
const STRUGGLING_UNSTABLE_SHARE = 1 / 3;
/** Predominantly mature, counted against everything in the scope. */
const STRONG_MATURE_SHARE = 0.6;

export type ScopeStats = {
  /** Every card in the scope, seen or not. */
  cards: number;
  /** Cards that have been answered at least once. */
  reviewed: number;
  /** Reviewed cards the scheduler is not holding: relearning, or repeatedly
   * lapsed and still on a short interval. */
  unstable: number;
  mature: number;
  /** Answers given in the trailing window, and how many of them were Again. */
  recentTotal: number;
  recentAgain: number;
};

/**
 * The one classifier. Precedence matters and is the order of the branches:
 *
 * 1. `new`     — nothing here has ever been answered.
 * 2. `struggling` — the recent answers keep coming back Again, or a meaningful
 *    share of what has been seen is not holding.
 * 3. `strong`  — predominantly mature, and not struggling.
 * 4. `learning` — everything else that has been started.
 *
 * Note what is *not* here: being due. A due card is a healthy card whose turn
 * has come round, and a deck does not turn amber for being scheduled today.
 */
export function learningStatusForScope(stats: ScopeStats): LearningStatus {
  const { cards, reviewed, unstable, mature, recentTotal, recentAgain } = stats;

  if (cards === 0 || reviewed === 0) return "new";

  const failingRecently =
    recentTotal >= STRUGGLING_MIN_ANSWERS &&
    recentAgain / recentTotal > STRUGGLING_AGAIN_SHARE;
  const notHolding = unstable / reviewed >= STRUGGLING_UNSTABLE_SHARE;
  if (failingRecently || notHolding) return "struggling";

  if (mature / cards >= STRONG_MATURE_SHARE) return "strong";

  return "learning";
}

/** The class that paints the mark. `new` is the unadorned base. */
export function statusClass(status: LearningStatus): string {
  return status === "new" ? "" : `status--${status}`;
}

/**
 * What the colour says, for anyone who cannot see it. The marks are small and
 * quiet by design, so this is the only description of them there is.
 */
export function statusLabel(status: LearningStatus): string {
  switch (status) {
    case "new":
      return "Not started";
    case "learning":
      return "Learning";
    case "struggling":
      return "Needs attention";
    case "strong":
      return "Strong";
  }
}

/** Which of the four buckets a card's schedule row falls in. */
function memoryState(row: {
  state: number | null;
  stability: number | null;
}): MemoryState {
  if (row.state === null || row.state === 0) return "unseen";
  if (row.state === 1 || row.state === 3) return "learning";
  return (row.stability ?? 0) >= MATURE_DAYS ? "mature" : "young";
}

/** What one card shows as in a row of marks — due first, then its memory. */
export function cardMark(
  row: { state: number | null; stability: number | null; due: number | null },
  at: number,
): CardMark {
  const memory = memoryState(row);
  if (memory === "unseen") return "unseen";
  return row.due !== null && row.due <= at ? "due" : memory;
}

/** The CSS class for one mark. Unseen is the unadorned base. */
export function markClass(mark: CardMark): string {
  return mark === "unseen" ? "" : `state-${mark}`;
}

export const MARK_LABEL: Record<CardMark, string> = {
  mature: "Mature",
  young: "Young",
  learning: "Learning",
  due: "Due",
  unseen: "Unseen",
};

/**
 * At most `max` marks for a set of cards, in the given order.
 *
 * Under the cap every card gets its own mark. Over it, a mark stands for a
 * share of the set rather than for one card — allocated by largest remainder
 * so the total is exact, and so no bucket that has cards in it is rounded away
 * to nothing. Without this a two-hundred-card topic drew two hundred marks
 * into a hundred-and-twenty-pixel column: each one hit its two-pixel floor and
 * all but the first twenty were clipped, leaving a row that looked like the
 * whole topic but showed a tenth of it.
 */
function proportionalSegments<T extends string>(
  counts: Record<T, number>,
  order: readonly T[],
  max: number,
): T[] {
  const total = order.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
  if (total === 0) return [];
  if (total <= max) return order.flatMap((key) => Array<T>(counts[key] ?? 0).fill(key));

  const shares = order.map((key) => {
    const want = ((counts[key] ?? 0) / total) * max;
    // Any bucket with cards in it keeps at least one mark.
    return { key, n: want > 0 ? Math.max(1, Math.floor(want)) : 0, rest: want - Math.floor(want) };
  });

  let assigned = shares.reduce((sum, c) => sum + c.n, 0);
  const byRest = [...shares].sort((a, b) => b.rest - a.rest);
  for (let i = 0; assigned < max; i = (i + 1) % byRest.length) {
    byRest[i].n += 1;
    assigned += 1;
  }
  // Overshoot happens once every non-empty bucket has been floored up. It stops
  // when nothing can give a mark back without disappearing, which is the one
  // case where the total may exceed the cap.
  for (let progress = true; assigned > max && progress; ) {
    progress = false;
    for (const c of byRest) {
      if (assigned <= max) break;
      if (c.n > 1) {
        c.n -= 1;
        assigned -= 1;
        progress = true;
      }
    }
  }

  return shares.flatMap((c) => Array<T>(c.n).fill(c.key));
}

const MEMORY_ORDER = ["mature", "young", "learning", "unseen"] as const;
const MARK_ORDER = ["mature", "young", "learning", "due", "unseen"] as const;

/** The memory distribution of a collection, as a row of at most `max` marks. */
export function memorySegments(
  memory: Record<MemoryState, number>,
  max: number,
): MemoryState[] {
  return proportionalSegments(memory, MEMORY_ORDER, max);
}

/**
 * A topic's cards as a row of at most `max` marks. Under the cap it is one
 * mark per card in the topic's own order; over it the marks are grouped by
 * state, because at that size their order says nothing anyway.
 */
export function markSegments(marks: CardMark[], max: number): CardMark[] {
  if (marks.length <= max) return marks;
  const counts = { mature: 0, young: 0, learning: 0, due: 0, unseen: 0 };
  for (const mark of marks) counts[mark] += 1;
  return proportionalSegments(counts, MARK_ORDER, max);
}
