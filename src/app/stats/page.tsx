import { getStats } from "@/lib/queries";
import { countLadderCards, getConceptLadders, ladderSummary } from "@/lib/ladder";
import Icon, { type IconName } from "@/components/Icon";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const WEEKS = 26; // ~6 months of history
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Four steps, so a quiet day and a heavy one aren't the same square. */
function intensity(count: number): string {
  if (!count) return "var(--surface-2)";
  if (count < 5) return "color-mix(in srgb, var(--accent) 28%, var(--surface-2))";
  if (count < 15) return "color-mix(in srgb, var(--accent) 58%, var(--surface-2))";
  if (count < 30) return "color-mix(in srgb, var(--accent) 82%, var(--surface-2))";
  return "var(--accent)";
}

function Stat({
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
    <div className="min-w-36 flex-1 border-l border-border px-4 py-1 first:border-l-0 first:pl-0">
      <div className="flex items-center gap-1.5 text-muted">
        <Icon name={icon} size={15} />
        <span className="label">{label}</span>
      </div>
      <div
        className={`display-title numeral mt-1.5 text-3xl ${tone === "accent" ? "text-accent" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

export default async function StatsPage() {
  const [{ totalCards, reviewsToday, streak, today, heatmap }, ladderCards, ladders] =
    await Promise.all([getStats(), countLadderCards(), getConceptLadders()]);
  const ladderStats = ladderSummary(ladders);

  // Align the grid so the last column ends today; each column is a week.
  const totalDays = WEEKS * 7;
  const startDay = today - totalDays + 1;

  const columns: { day: number; count: number }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: { day: number; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = startDay + w * 7 + d;
      col.push({ day, count: day <= today ? (heatmap[day] ?? 0) : -1 });
    }
    columns.push(col);
  }

  // A month label above the first column that starts a new month.
  const monthLabels = columns.map((col, i) => {
    const date = new Date(col[0].day * DAY_MS);
    const previous = i === 0 ? null : new Date(columns[i - 1][0].day * DAY_MS);
    return !previous || previous.getUTCMonth() !== date.getUTCMonth()
      ? MONTHS[date.getUTCMonth()]
      : "";
  });

  const totalReviews = Object.values(heatmap).reduce((a, b) => a + b, 0);
  const last7 = Array.from({ length: 7 }, (_, i) => heatmap[today - i] ?? 0).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow mb-2">Your rhythm</p>
        <h1 className="display-title text-3xl sm:text-4xl">Study activity</h1>
      </header>

      <div className="panel flex flex-wrap gap-y-5 px-4 py-5 sm:px-6">
        <Stat value={totalCards} label="Cards" icon="cards" />
        <Stat value={reviewsToday} label="Today" icon="play" tone="accent" />
        <Stat value={last7} label="Last 7 days" icon="clock" />
        <Stat value={streak} label="Day streak" icon="flame" />
        <Stat value={totalReviews} label="Total reviews" icon="stats" />
      </div>

      {ladderCards > 0 && (
        <Link
          href="/edge"
          className="panel transition-state flex flex-wrap items-center gap-x-6 gap-y-4 px-4 py-5 hover:border-accent-tint-border sm:px-6"
        >
          <Stat value={ladderStats.concepts} label="Concepts" icon="ladder" />
          <Stat
            value={`${ladderStats.climbed}/${ladderStats.rungs}`}
            label="Rungs standing"
            icon="target"
          />
          <Stat value={ladderStats.complete} label="Full ladders" icon="check" />
          <span className="flex items-center gap-1.5 self-end text-sm font-medium text-accent">
            Edge map
            <Icon name="arrowRight" size={16} />
          </span>
        </Link>
      )}

      <section className="panel p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Review activity</h2>
          <span className="text-xs text-muted">Last {WEEKS} weeks</span>
        </div>

        <div className="overflow-x-auto">
          <div className="flex w-fit gap-1">
            {/* Weekday gutter: Monday, Wednesday, Friday, as calendars label them. */}
            <div className="mr-1 flex flex-col gap-1 pt-4 text-[10px] leading-3 text-faint">
              {["", "M", "", "W", "", "F", ""].map((d, i) => (
                <span key={i} className="flex h-3 items-center">
                  {d}
                </span>
              ))}
            </div>
            {columns.map((col, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="h-3 text-[10px] leading-3 text-faint">{monthLabels[i]}</span>
                {col.map(({ day, count }) => (
                  <div
                    key={day}
                    title={
                      count >= 0
                        ? `${new Date(day * DAY_MS).toISOString().slice(0, 10)}: ${count} review${count === 1 ? "" : "s"}`
                        : ""
                    }
                    className="heat-cell"
                    style={{ background: count < 0 ? "transparent" : intensity(count) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-1 text-xs text-muted">
          <span>less</span>
          {[0, 4, 14, 25, 40].map((c) => (
            <div key={c} className="heat-cell" style={{ background: intensity(c) }} />
          ))}
          <span>more</span>
        </div>
      </section>

      {totalReviews === 0 && (
        <p className="text-center text-sm text-muted">
          No reviews yet — grade some cards and your activity will show up here.
        </p>
      )}
    </div>
  );
}
