import { getStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const WEEKS = 26; // ~6 months of history

function intensity(count: number): string {
  if (!count) return "var(--surface-2)";
  if (count < 5) return "color-mix(in srgb, var(--accent) 30%, var(--surface-2))";
  if (count < 15) return "color-mix(in srgb, var(--accent) 60%, var(--surface-2))";
  return "var(--accent)";
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-surface p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

export default async function StatsPage() {
  const { totalCards, reviewsToday, streak, today, heatmap } = await getStats();

  // Align the grid so the last column ends today; each column is a week.
  const totalDays = WEEKS * 7;
  const startDay = today - totalDays + 1;

  const columns: { day: number; count: number }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: { day: number; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = startDay + w * 7 + d;
      col.push({ day, count: day <= today ? heatmap[day] ?? 0 : -1 });
    }
    columns.push(col);
  }

  const totalReviews = Object.values(heatmap).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Stats</h1>

      <div className="flex flex-wrap gap-3">
        <Stat value={totalCards} label="Cards" />
        <Stat value={reviewsToday} label="Reviews today" />
        <Stat value={`${streak}🔥`} label="Day streak" />
        <Stat value={totalReviews} label="Total reviews" />
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 text-sm font-medium text-muted">
          Review activity
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {columns.map((col, i) => (
            <div key={i} className="flex flex-col gap-1">
              {col.map(({ day, count }) => (
                <div
                  key={day}
                  title={
                    count >= 0
                      ? `${new Date(day * DAY_MS).toISOString().slice(0, 10)}: ${count} review${count === 1 ? "" : "s"}`
                      : ""
                  }
                  className="size-3 rounded-[3px]"
                  style={{
                    background: count < 0 ? "transparent" : intensity(count),
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-1 text-xs text-muted">
          <span>less</span>
          {[0, 4, 14, 20].map((c) => (
            <div
              key={c}
              className="size-3 rounded-[3px]"
              style={{ background: intensity(c) }}
            />
          ))}
          <span>more</span>
        </div>
      </div>

      {totalReviews === 0 && (
        <p className="text-center text-sm text-muted">
          No reviews yet — grade some cards and your activity will show up here.
        </p>
      )}
    </div>
  );
}
