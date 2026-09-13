import Icon, { type IconName } from "./Icon";

/**
 * One number and what it counts. Shared by Stats and the edge map so a figure
 * means the same thing, and is drawn the same way, wherever it appears.
 *
 * It sits in a grid rather than a stretched flex row: five of these spread
 * across a 1400px panel left the value and its label an inch apart with nothing
 * between them, which is what made the page read as mostly empty.
 *
 * `tone` colours the number *and* its glyph, and the two always agree. Only
 * reach for one when the figure carries that meaning: amber for what is
 * waiting, green for what has been learned, red for what keeps slipping, teal
 * for what a thing simply is. Left alone a tile is plain, which is the right
 * answer for most of them — a panel where every number is coloured says no
 * more than a panel where none of them is.
 */
export type Tone = "accent" | "due" | "good" | "again" | "info";

const VALUE: Record<Tone, string> = {
  accent: "text-accent",
  due: "text-due",
  good: "text-good",
  again: "text-again",
  info: "text-info",
};

const GLYPH: Record<Tone, string> = {
  accent: "bg-accent-tint text-accent",
  due: "bg-due-tint text-due",
  good: "bg-good-tint text-good",
  again: "bg-again-tint text-again",
  info: "bg-info-tint text-info",
};

export default function StatTile({
  value,
  label,
  icon,
  tone,
  hint,
}: {
  value: string | number;
  label: string;
  icon: IconName;
  tone?: Tone;
  /** A second line under the label: the denominator, the comparison, the unit. */
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
          tone ? GLYPH[tone] : "bg-surface-2 text-muted"
        }`}
      >
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0">
        <div
          className={`display-title numeral text-xl leading-none ${tone ? VALUE[tone] : ""}`}
        >
          {value}
        </div>
        <div className="label mt-1 truncate">{label}</div>
        {hint && <div className="mt-0.5 truncate text-[0.7rem] text-faint">{hint}</div>}
      </div>
    </div>
  );
}
