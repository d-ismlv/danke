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
export function memoryState(row: {
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
 * One mark per card, in memory order, capped so a large library stays a row of
 * marks rather than a haze of hairlines. Over the cap the marks are shares
 * rather than cards, allocated by largest remainder so the total is exact and
 * no non-empty bucket is rounded away to nothing.
 */
export function memorySegments(
  memory: Record<MemoryState, number>,
  max: number,
): MemoryState[] {
  const order: MemoryState[] = ["mature", "young", "learning", "unseen"];
  const total = order.reduce((sum, key) => sum + memory[key], 0);
  if (total === 0) return [];
  if (total <= max) return order.flatMap((key) => Array<MemoryState>(memory[key]).fill(key));

  const exact = order.map((key) => ({ key, want: (memory[key] / total) * max }));
  const counts = exact.map((e) => ({
    key: e.key,
    // A bucket with any cards in it gets at least one mark; the rest floor.
    n: e.want > 0 ? Math.max(1, Math.floor(e.want)) : 0,
    rest: e.want - Math.floor(e.want),
  }));

  let assigned = counts.reduce((sum, c) => sum + c.n, 0);
  const byRest = [...counts].sort((a, b) => b.rest - a.rest);
  for (let i = 0; assigned < max; i = (i + 1) % byRest.length) {
    byRest[i].n += 1;
    assigned += 1;
  }
  // Overshoot is possible once every non-empty bucket has been floored up. It
  // stops when nothing can give a mark back without disappearing entirely,
  // which is the one case where the total is allowed to exceed the cap.
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

  return counts.flatMap((c) => Array<MemoryState>(c.n).fill(c.key));
}
