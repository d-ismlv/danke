import { getStats } from "@/lib/queries";
import { countLadderCards, getConceptLadders, ladderSummary } from "@/lib/ladder";
import Icon from "@/components/Icon";
import StatTile from "@/components/StatTile";
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

      <div className="panel grid grid-cols-2 gap-x-6 gap-y-5 px-4 py-5 sm:grid-cols-3 sm:px-6 lg:grid-cols-5">
        <StatTile value={totalCards} label="Cards" icon="cards" />
        <StatTile value={reviewsToday} label="Today" icon="play" tone="accent" />
        <StatTile value={last7} label="Last 7 days" icon="clock" />
        <StatTile value={streak} label="Day streak" icon="flame" />
        <StatTile value={totalReviews} label="Total reviews" icon="stats" />
      </div>

      {ladderCards > 0 && (
        <Link
          href="/edge"
          className="panel transition-state grid grid-cols-2 items-center gap-x-6 gap-y-5 px-4 py-5 hover:border-accent-tint-border sm:grid-cols-4 sm:px-6"
        >
          <StatTile value={ladderStats.concepts} label="Concepts" icon="ladder" />
          <StatTile
            value={`${ladderStats.climbed}/${ladderStats.rungs}`}
            label="Rungs standing"
            icon="target"
          />
          <StatTile value={ladderStats.complete} label="Full ladders" icon="check" />
          <span className="col-span-2 flex items-center gap-1.5 text-sm font-medium text-accent sm:col-span-1 sm:justify-end">
            Edge map
            <Icon name="arrowRight" size={16} />
          </span>
        </Link>
      )}

      <section className="panel p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Review activity</h2>
          <span className="text-xs text-muted">
            {totalReviews === 0
              ? "Nothing graded yet"
              : `${totalReviews} review${totalReviews === 1 ? "" : "s"} · last ${WEEKS} weeks`}
          </span>
        </div>

        <div className="flex gap-2">
          {/* Weekday gutter: Monday, Wednesday, Friday, as calendars label them. */}
          <div
            className="grid shrink-0 grid-rows-7 gap-[3px] pt-4 text-[10px] text-faint"
            aria-hidden="true"
          >
            {["", "M", "", "W", "", "F", ""].map((d, i) => (
              <span key={i} className="flex items-center leading-none">
                {d}
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="mb-[3px] grid gap-[3px] text-[10px] leading-4 text-faint"
              style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}
              aria-hidden="true"
            >
              {monthLabels.map((m, i) => (
                <span key={i} className="whitespace-nowrap">
                  {m}
                </span>
              ))}
            </div>
            <div
              className="heat-grid"
              style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}
            >
              {columns.flatMap((col) =>
                col.map(({ day, count }) => (
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
                )),
              )}
            </div>
            <div className="mt-3 flex items-center justify-end gap-1 text-xs text-muted">
              <span>less</span>
              {[0, 4, 14, 25, 40].map((c) => (
                <div key={c} className="heat-key" style={{ background: intensity(c) }} />
              ))}
              <span>more</span>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}
