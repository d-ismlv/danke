/**
 * The progress bar, and the only one in the app.
 *
 * Wherever it appears — a deck tile, a topic row, the Progress page — it means
 * the same thing: the share of these cards that is holding in memory. A bar
 * that means one thing everywhere can be read without a legend.
 *
 * It is always drawn beside the figure it represents, so it is decorative:
 * a screen reader gets the number from the text, not twice from the bar.
 */
export default function Meter({
  percent,
  large = false,
  className = "",
}: {
  percent: number;
  large?: boolean;
  className?: string;
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={`meter ${large ? "meter-lg" : ""} ${className}`} aria-hidden="true">
      <i style={{ width: `${value}%` }} />
    </div>
  );
}
