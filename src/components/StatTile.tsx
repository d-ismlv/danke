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
 *
 * The glyph is bare, and set from the top rather than centred. It used to sit
 * on a 28px tinted plate, which is taller than the 17.5px number beside it: the
 * value rose clear above the top of its own square and the row read as two
 * things that had come apart. Nothing is left to mismatch now, and the tone
 * still carries — it moved from the plate onto the glyph itself.
 */
export type Tone = "accent" | "due" | "good" | "again" | "info";

const TONE: Record<Tone, string> = {
  accent: "text-accent",
  due: "text-due",
  good: "text-good",
  again: "text-again",
  info: "text-info",
};

export default function StatTile({
  value,
  label,
  icon,
  tone,
  hint,
  align = "start",
}: {
  value: string | number;
  label: string;
  icon: IconName;
  tone?: Tone;
  /** A second line under the label: the denominator, the comparison, the unit. */
  hint?: string;
  /** `center` spaces a short row of tiles evenly across its panel instead of
   *  letting the first hug the left edge and the last trail off. */
  align?: "start" | "center";
}) {
  return (
    <div
      className={`flex items-start gap-2.5 ${align === "center" ? "sm:justify-center" : ""}`}
    >
      <span className={`shrink-0 ${tone ? TONE[tone] : "text-muted"}`}>
        <Icon name={icon} size={19} />
      </span>
      <div className="min-w-0">
        <div className={`display-title numeral text-xl leading-none ${tone ? TONE[tone] : ""}`}>
          {value}
        </div>
        <div className="label mt-1 truncate">{label}</div>
        {hint && <div className="mt-0.5 truncate text-[0.7rem] text-faint">{hint}</div>}
      </div>
    </div>
  );
}
