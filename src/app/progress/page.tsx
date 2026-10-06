import Link from "next/link";
import { getProgress, now } from "@/lib/queries";
import { statusLabel, type MemoryState } from "@/lib/status";
import { StatusMark } from "@/components/Marks";

export const dynamic = "force-dynamic";
export const metadata = { title: "Progress" };

const DAY_MS = 86_400_000;
/** A year of weeks, which is as far back as the answers are counted. */
const WEEKS = 52;
/** What still draws a day at a size you can point at on a phone: the most
 * recent half of the year. */
const NARROW_WEEKS = 26;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Rows run Monday to Sunday; every other one is labelled, as on a calendar. */
const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", ""];

const MEMORY: { key: MemoryState; label: string }[] = [
  { key: "mature", label: "Mature" },
  { key: "young", label: "Young" },
  { key: "learning", label: "Learning" },
  { key: "unseen", label: "Unseen" },
];

export default async function ProgressPage() {
  const p = await getProgress(now());
  const { memory, totalCards } = p;

  if (totalCards === 0) {
    return (
      <section aria-labelledby="progress-title">
        <header className="page-heading">
          <div className="page-heading__row">
            <h1 id="progress-title">Progress</h1>
          </div>
        </header>
        <div className="empty-state">
          <h2>Nothing to measure yet</h2>
          <p>Import some cards and study them — this page fills in from the first answer.</p>
          <Link href="/import" className="primary-action">
            Import cards
          </Link>
        </div>
      </section>
    );
  }

  /* Whole calendar weeks, Monday first, ending with this one — so a row is a
     weekday and the days after today are left blank. Day 0 was a Thursday. */
  const startDay = p.today - ((p.today + 3) % 7) - (WEEKS - 1) * 7;
  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = startDay + w * 7 + d;
      return { day, count: day <= p.today ? (p.heatmap[day] ?? 0) : -1 };
    }),
  );
  const shade = shades(weeks.flat().map((cell) => cell.count));
  const months = monthLabels(startDay, WEEKS);
  const total = (from: number) =>
    weeks.slice(from).flat().reduce((sum, cell) => sum + Math.max(0, cell.count), 0);
  const yearTotal = total(0);
  const halfTotal = total(WEEKS - NARROW_WEEKS);
  const share = (n: number) => `${((n / totalCards) * 100).toFixed(2)}%`;

  return (
    <section aria-labelledby="progress-title">
      <header className="page-heading">
        <div className="page-heading__row">
          <h1 id="progress-title">Progress</h1>
        </div>
      </header>

      <section className="progress-hero" aria-label="Progress summary">
        <div className="progress-hero__primary">
          <span>Learned</span>
          <strong>{p.percent}%</strong>
          <p>
            {memory.mature + memory.young} / {totalCards} learned
          </p>
        </div>
        <div>
          <span>Streak</span>
          <strong>{p.streak}</strong>
          <p>{p.streak === 1 ? "day in a row" : "days in a row"}</p>
        </div>
        <div>
          <span>Recall</span>
          <strong>{p.recall === null ? "—" : `${p.recall}%`}</strong>
          <p>last 30 days</p>
        </div>
        <div>
          <span>Today</span>
          <strong>{p.reviewsToday}</strong>
          <p>cards answered</p>
        </div>
      </section>

      <section className="memory-panel" aria-labelledby="memory-title">
        <header className="section-heading">
          <div>
            <p className="eyebrow">
              {totalCards} card{totalCards === 1 ? "" : "s"}
            </p>
            <h2 id="memory-title">Memory state</h2>
          </div>
        </header>
        {/* Only the buckets that have cards in them. An empty one still took
            its share of the row's gaps, which pushed the whole bar in from the
            edge the heading above it is aligned to. */}
        <div
          className="large-segments"
          role="img"
          aria-label={MEMORY.map((m) => `${memory[m.key]} ${m.label.toLowerCase()}`).join(", ")}
        >
          {MEMORY.filter((m) => memory[m.key] > 0).map((m) => (
            <span
              key={m.key}
              className={`large-segments__${m.key}`}
              style={{ "--share": share(memory[m.key]) } as React.CSSProperties}
            />
          ))}
        </div>
        <div className="memory-keys">
          {MEMORY.map((m) => (
            <div key={m.key}>
              <i className={m.key === "unseen" ? undefined : `state-${m.key}`} />
              <span>{m.label}</span>
              <strong>{memory[m.key]}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="activity" aria-labelledby="activity-title">
        {/* The grid drops its older half when the panel is too narrow for a
            year of days, so each heading has the figure for either width. */}
        <header className="section-heading">
          <div>
            <p className="eyebrow">
              <span className="activity__wide">Past year</span>
              <span className="activity__narrow">Past {NARROW_WEEKS} weeks</span>
            </p>
            <h2 id="activity-title">Activity</h2>
          </div>
          <span>
            <span className="activity__wide">{reviews(yearTotal)}</span>
            <span className="activity__narrow">{reviews(halfTotal)}</span>
          </span>
        </header>
        <div className="heatmap" role="img" aria-label="Answers per day">
          <div className="heatmap__days" aria-hidden="true">
            <span />
            {WEEKDAYS.map((name, d) => (
              <span key={d}>{name}</span>
            ))}
          </div>
          {weeks.map((week, w) => (
            <div
              key={week[0].day}
              className={
                w < WEEKS - NARROW_WEEKS ? "heatmap__week heatmap__week--older" : "heatmap__week"
              }
            >
              <span className="heatmap__month">{months[w]}</span>
              {week.map(({ day, count }) =>
                count < 0 ? (
                  <i key={day} data-future="" />
                ) : (
                  <i
                    key={day}
                    data-level={shade.level(count)}
                    // A day number is a calendar date; read back through UTC it
                    // is that date, whatever zone the day was counted in.
                    title={`${new Date(day * DAY_MS).toISOString().slice(0, 10)} · ${reviews(count)}`}
                  />
                ),
              )}
            </div>
          ))}
        </div>
        <div className="heatmap-legend" aria-hidden="true">
          <span>Less</span>
          {shade.ranges.map((range, level) => (
            <i key={level} data-level={level} title={range} />
          ))}
          <span>More</span>
        </div>
      </section>

      <section className="section-block" aria-labelledby="deck-progress-title">
        <header className="section-heading section-heading--progress">
          <div>
            <h2 id="deck-progress-title">By deck</h2>
          </div>
          <div className="progress-column-labels">
            <span>Learned</span>
            <span>Recall</span>
          </div>
        </header>
        <div className="progress-list">
          {p.decks.map((deck) => (
            <Link key={deck.id} href={`/decks/${deck.id}`}>
              <span className="deck-identity">
                <StatusMark status={deck.counts.status} />
                <strong>{deck.name}</strong>
              </span>
              <span>
                {deck.counts.learned} of {deck.counts.cards}
              </span>
              <strong>
                {deck.counts.percent}%<span className="sr-only"> learned</span>
              </strong>
              <strong>
                {deck.counts.recall === null ? "—" : `${deck.counts.recall}%`}
                <span className="sr-only"> recall. {statusLabel(deck.counts.status)}.</span>
              </strong>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}

function reviews(n: number): string {
  return `${n} review${n === 1 ? "" : "s"}`;
}

/**
 * Which of five shades a day takes, and what each shade covers.
 *
 * Measured against your own days rather than fixed counts. Fixed bands were
 * written for someone answering a handful of cards a day; anyone who studies
 * more than that filled every square with the darkest one, and the grid said
 * nothing about which days were the long ones.
 *
 * The four shades past the first split the counts your days have actually
 * had into quarters, quietest to busiest — each different count once, however
 * many days share it. Counting days instead put every day in one shade when
 * most of them were alike, and a scale stretched to the busiest day let one
 * marathon wash every other day out to the palest. Whatever you study, the
 * light days and the long ones come out apart, and the busiest is the darkest.
 */
function shades(counts: number[]): {
  level: (count: number) => number;
  ranges: string[];
} {
  const values = [...new Set(counts.filter((n) => n > 0))].sort((a, b) => a - b);
  const rank = new Map(values.map((n, i) => [n, i + 1]));
  const level = (count: number) =>
    count <= 0 ? 0 : Math.ceil((4 * (rank.get(count) ?? values.length)) / values.length);

  const bounds: { min: number; max: number }[] = [];
  for (const n of values) {
    const at = level(n);
    bounds[at] = { min: bounds[at]?.min ?? n, max: n };
  }
  const ranges = [0, 1, 2, 3, 4].map((at) => {
    if (at === 0) return "No reviews";
    const range = bounds[at];
    if (!range) return "No days at this shade yet";
    return range.min === range.max
      ? reviews(range.max)
      : `${range.min}–${reviews(range.max)}`;
  });
  return { level, ranges };
}

/**
 * The month each week starts, on the week holding its 1st; the rest are
 * blank. The first week is labelled too, unless the next month's label is
 * close enough behind it to collide.
 */
function monthLabels(startDay: number, weeks: number): string[] {
  const labels = Array.from({ length: weeks }, (_, w) => {
    for (let d = 0; d < 7; d++) {
      const date = new Date((startDay + w * 7 + d) * DAY_MS);
      if (date.getUTCDate() === 1) return MONTHS[date.getUTCMonth()];
    }
    return "";
  });
  if (!labels[0] && labels.slice(1, 3).every((label) => !label)) {
    labels[0] = MONTHS[new Date(startDay * DAY_MS).getUTCMonth()];
  }
  return labels;
}
