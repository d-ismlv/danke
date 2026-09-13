import Link from "next/link";
import { getStats, type GradeMix } from "@/lib/queries";
import {
  countLadderCards,
  getConceptLadders,
  getRungProfile,
  ladderSummary,
  RUNG_NAMES,
} from "@/lib/ladder";
import Icon from "@/components/Icon";
import StatTile from "@/components/StatTile";

export const dynamic = "force-dynamic";

export const metadata = { title: "Stats" };

const DAY_MS = 86_400_000;
const WEEKS = 52; // a year, which is also what fills the panel at a legible cell size
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Four steps, so a quiet day and a heavy one aren't the same square.
 * Green rather than the accent: the heatmap counts days you turned up, which
 * is the same thing the passed rungs and the recall figure are saying. */
function intensity(count: number): string {
  if (!count) return "var(--surface-2)";
  if (count < 5) return "color-mix(in srgb, var(--good) 30%, var(--surface-2))";
  if (count < 15) return "color-mix(in srgb, var(--good) 60%, var(--surface-2))";
  if (count < 30) return "color-mix(in srgb, var(--good) 82%, var(--surface-2))";
  return "var(--good)";
}

/** Recall is read against the schedule, not against zero: below about 75% the
 * intervals are outrunning you, and the only end worth alarming about is the
 * low one. */
function recallTone(pct: number | null): "good" | "due" | "again" | undefined {
  if (pct === null) return undefined;
  if (pct < 75) return "again";
  if (pct < 85) return "due";
  return "good";
}

function barColor(pct: number | null): string {
  if (pct === null) return "var(--surface-2)";
  if (pct < 75) return "var(--again)";
  if (pct < 85) return "var(--hard)";
  return "var(--good)";
}

const GRADES: { key: keyof GradeMix; label: string; color: string }[] = [
  { key: "again", label: "Again", color: "var(--again)" },
  { key: "hard", label: "Hard", color: "var(--hard)" },
  { key: "good", label: "Good", color: "var(--good)" },
  { key: "easy", label: "Easy", color: "var(--easy)" },
];

const MATURITY = [
  { label: "Mature", key: "mature", color: "var(--good)" },
  { label: "Young", key: "young", color: "var(--easy)" },
  { label: "Learning", key: "learning", color: "var(--hard)" },
  { label: "Unseen", key: "fresh", color: "var(--surface-2)" },
] as const;

export default async function StatsPage() {
  const [stats, ladderCards, ladders, rungProfile] = await Promise.all([
    getStats(),
    countLadderCards(),
    getConceptLadders(),
    getRungProfile(),
  ]);
  const {
    totalCards, reviewsToday, streak, bestStreak, daysStudied, today, heatmap,
    grades, retention, retentionAll, forecast, due, maturity,
  } = stats;
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
  const last7 = Array.from({ length: 7 }, (_, i) => heatmap[today - i] ?? 0).reduce((a, b) => a + b, 0);
  const perActiveDay = daysStudied === 0 ? 0 : Math.round(totalReviews / daysStudied);

  const recentTotal = GRADES.reduce((n, g) => n + grades.recent[g.key], 0);
  const allTotal = GRADES.reduce((n, g) => n + grades.all[g.key], 0);
  const gradeSource = recentTotal > 0 ? grades.recent : grades.all;
  const gradeTotal = recentTotal > 0 ? recentTotal : allTotal;

  const nextWeek = forecast.slice(0, 7).reduce((n, f) => n + f.count, 0);

  // Weakest first is the order getConceptLadders already returns, so the head
  // of the list is the answer to "what should I drill next".
  const shaky = ladders.filter((l) => l.edge !== null && l.reviewedCount > 0).slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow mb-2">Your rhythm</p>
        <h1 className="display-title text-2xl sm:text-3xl">Study activity</h1>
      </header>

      <div className="panel grid grid-cols-2 gap-x-6 gap-y-5 px-4 py-5 sm:grid-cols-3 sm:px-6 lg:grid-cols-5">
        <StatTile value={totalCards} label="Cards" icon="cards" hint={`${maturity.mature} holding 3 weeks+`} />
        <StatTile
          value={due}
          label="Due now"
          icon="clock"
          tone={due > 0 ? "due" : undefined}
          hint={`${nextWeek} more this week`}
        />
        <StatTile
          value={retention === null ? "—" : `${retention}%`}
          label="Recall · 30d"
          icon="target"
          tone={recallTone(retention)}
          hint={retentionAll === null ? "nothing graded yet" : `${retentionAll}% all time`}
        />
        <StatTile
          value={streak}
          label="Day streak"
          icon="flame"
          tone={streak > 0 ? "good" : undefined}
          hint={`best ${bestStreak} · ${daysStudied} days studied`}
        />
        <StatTile
          value={reviewsToday}
          label="Today"
          icon="play"
          hint={`${last7} in 7 days · ~${perActiveDay} a day`}
        />
      </div>

      {allTotal > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel p-5 sm:p-6">
            <div className="mb-3.5 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold">How you answered</h2>
              <span className="text-xs text-muted">
                {recentTotal > 0 ? "past 30 days" : "all time"} · {gradeTotal} reviews
              </span>
            </div>
            <div className="meter" role="img" aria-label="Grade mix">
              {GRADES.map((g) => (
                <span
                  key={g.key}
                  style={{ width: `${(gradeSource[g.key] / gradeTotal) * 100}%`, backgroundColor: g.color }}
                />
              ))}
            </div>
            <dl className="mt-3.5 grid grid-cols-4 gap-2">
              {GRADES.map((g) => (
                <div key={g.key}>
                  <dt className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: g.color }} />
                    {g.label}
                  </dt>
                  <dd className="numeral mt-1 text-sm font-semibold">
                    {Math.round((gradeSource[g.key] / gradeTotal) * 100)}%
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="mb-3.5 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold">How deep it goes</h2>
              <span className="text-xs text-muted">{totalCards} cards</span>
            </div>
            <div className="meter" role="img" aria-label="Card maturity">
              {MATURITY.slice(0, 3).map((m) => (
                <span
                  key={m.key}
                  style={{ width: `${(maturity[m.key] / Math.max(1, totalCards)) * 100}%`, backgroundColor: m.color }}
                />
              ))}
            </div>
            <dl className="mt-3.5 grid grid-cols-4 gap-2">
              {MATURITY.map((m) => (
                <div key={m.key}>
                  <dt className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: m.color }} />
                    {m.label}
                  </dt>
                  <dd className="numeral mt-1 text-sm font-semibold">{maturity[m.key]}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      )}

      <section className="panel p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Review activity</h2>
          <span className="text-xs text-muted">
            {totalReviews === 0
              ? "Nothing graded yet"
              : `${totalReviews} review${totalReviews === 1 ? "" : "s"} · past year`}
          </span>
        </div>

        <div className="flex gap-2">
          {/* Weekday gutter: Monday, Wednesday, Friday, as calendars label them. */}
          <div className="grid shrink-0 grid-rows-7 gap-[2px] pt-4 text-[10px] text-faint" aria-hidden="true">
            {["", "M", "", "W", "", "F", ""].map((d, i) => (
              <span key={i} className="flex items-center leading-none">{d}</span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="mb-[2px] grid justify-start gap-[2px] text-[10px] leading-4 text-faint"
              style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 0.72rem))` }}
              aria-hidden="true"
            >
              {monthLabels.map((m, i) => (
                <span key={i} className="whitespace-nowrap">{m}</span>
              ))}
            </div>
            <div className="heat-grid" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 0.72rem))` }}>
              {columns.flatMap((col) =>
                col.map(({ day, count }) => {
                  // A day in the future is a hole in the grid, not a cell.
                  if (count < 0) {
                    return <div key={day} className="heat-cell" aria-hidden="true" />;
                  }
                  const label = `${new Date(day * DAY_MS).toISOString().slice(0, 10)}: ${count} review${count === 1 ? "" : "s"}`;
                  /* A focusable element with a name, not a div with a title:
                     364 days of counts were readable only by hovering a mouse
                     over them, which is no help to a keyboard or a screen
                     reader. Tab reaches them now and the name is announced. */
                  return (
                    <button
                      key={day}
                      type="button"
                      title={label}
                      aria-label={label}
                      className="heat-cell"
                      style={{ background: intensity(count) }}
                    />
                  );
                }),
              )}
            </div>
            <div className="mt-2.5 flex w-fit items-center gap-1 text-xs text-muted">
              <span>less</span>
              {[0, 4, 14, 25, 40].map((c) => (
                <div key={c} className="heat-key" style={{ background: intensity(c) }} />
              ))}
              <span>more</span>
            </div>
          </div>
        </div>
      </section>

      {ladderCards > 0 && (
        <section className="panel overflow-hidden">
          <div className="border-b border-border px-4 py-3 sm:px-6">
            <h2 className="text-sm font-semibold">Ladders</h2>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-5 px-4 py-5 sm:grid-cols-4 sm:px-6">
            <StatTile
              value={ladderStats.concepts}
              label="Concepts"
              icon="ladder"
              tone="info"
              align="center"
            />
            <StatTile
              value={`${ladderStats.climbed}/${ladderStats.rungs}`}
              label="Rungs standing"
              icon="target"
              align="center"
            />
            <StatTile
              value={ladderStats.complete}
              label="Full ladders"
              icon="check"
              tone={ladderStats.complete > 0 ? "good" : undefined}
              align="center"
            />
            <StatTile
              value={ladderStats.due}
              label="Due now"
              icon="clock"
              tone={ladderStats.due > 0 ? "due" : undefined}
              align="center"
            />
          </div>

          {rungProfile.some((r) => r.reviews > 0) && (
            <div className="border-t border-border px-4 py-5 sm:px-6">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold">Recall by rung</h3>
                <span className="text-xs text-muted">where the ladders give way</span>
              </div>
              <div className="flex items-end gap-2 sm:gap-3">
                {rungProfile.map((r) => (
                  <div key={r.rung} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <span className="numeral text-[0.7rem] font-semibold leading-none">
                      {r.retention === null ? "—" : `${r.retention}%`}
                    </span>
                    <div className="gauge h-20 w-full max-w-12">
                      <div className="bar-track">
                        <div
                          className="bar"
                          title={`Rung ${r.rung} — ${RUNG_NAMES[r.rung] ?? ""}: ${r.recalled}/${r.reviews} recalled`}
                          style={{ height: `${Math.max(2, r.retention ?? 0)}%`, backgroundColor: barColor(r.retention) }}
                        />
                      </div>
                    </div>
                    <span className="numeral text-[0.7rem] font-semibold leading-none">{r.rung}</span>
                    <span className="hidden truncate text-[0.65rem] leading-none text-faint sm:block">
                      {RUNG_NAMES[r.rung] ?? ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {shaky.length > 0 && (
            <div className="border-t border-border">
              <div className="flex items-baseline justify-between gap-3 px-4 py-3 sm:px-6">
                <h3 className="text-sm font-semibold">Weakest concepts</h3>
                <span className="text-xs text-muted">drill the edge</span>
              </div>
              <ul className="divide-y divide-border border-t border-border">
                {shaky.map((l) => (
                  <li key={l.conceptId}>
                    <Link
                      href={`/drill/${encodeURIComponent(l.conceptId)}`}
                      className="row group flex items-center gap-3 px-4 py-2.5 sm:px-6"
                    >
                      <span className="rung-cell shrink-0" data-state="edge">{l.edge}</span>
                      <span className="min-w-0 flex-1">
                        <span className="transition-state block truncate text-sm font-semibold group-hover:text-accent">
                          {l.conceptId}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          Holds to rung {l.highest} · edge at {RUNG_NAMES[l.edge!] ?? ""}
                        </span>
                      </span>
                      {l.dueCount > 0 && (
                        <span className="chip chip-due">
                          <Icon name="clock" size={12} />
                          {l.dueCount} due
                        </span>
                      )}
                      <Icon name="arrowRight" size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
