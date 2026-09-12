import Icon, { type IconName } from "./Icon";

/**
 * One number and what it counts. Shared by Stats and the edge map so a figure
 * means the same thing, and is drawn the same way, wherever it appears.
 *
 * It sits in a grid rather than a stretched flex row: five of these spread
 * across a 1400px panel left the value and its label an inch apart with nothing
 * between them, which is what made the page read as mostly empty.
 */
export default function StatTile({
  value,
  label,
  icon,
  tone,
}: {
  value: string | number;
  label: string;
  icon: IconName;
  tone?: "accent";
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted">
        <Icon name={icon} size={17} />
      </span>
      <div className="min-w-0">
        <div
          className={`display-title numeral text-2xl leading-none ${
            tone === "accent" ? "text-accent" : ""
          }`}
        >
          {value}
        </div>
        <div className="label mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}
