import Link from "next/link";
import { getProgress, now } from "@/lib/queries";
import Icon from "@/components/Icon";
import { Figure } from "@/components/Figures";
import { MemoryBar, MemoryLabels, StatusMark } from "@/components/Marks";
import { plural } from "@/components/Cells";
import RowNote from "@/components/RowNote";

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
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function ProgressPage() {
  const at = now();
  const p = await getProgress(at);
  const { memory, totalCards } = p;

  if (totalCards === 0) {
    return (
      <section className="panel" aria-labelledby="progress-title">
        <div className="head">
          <div className="head__main">
            <p className="eyebrow" aria-hidden="true" />
            <h1 className="title" id="progress-title">
              Progress
            </h1>
          </div>
        </div>
        <div className="empty">
          <h2>Nothing to measure yet</h2>
          <p>Import some cards and study them — this page fills in from the first answer.</p>
          <Link href="/import" className="btn btn--primary">
            <Icon name="plus" />
            Add cards
          </Link>
        </div>
      </section>
    );
  }

  /* Whole calendar weeks, Monday first, ending with this one — so a row is a
     weekday and the days after today are left blank. Day 0 was a Thursday. */
  const monday = p.today - ((p.today + 3) % 7);
  const startDay = monday - (WEEKS - 1) * 7;
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
  const busiest = weeks.flat().reduce((best, cell) => (cell.count > best.count ? cell : best), {
    day: 0,
    count: 0,
  });
  const learned = memory.mature + memory.young;

  return (
    <>
      <section className="panel" aria-labelledby="progress-title">
        <div className="head">
          <div className="head__main">
            <p className="eyebrow">
              {plural(totalCards, "card")} · {plural(p.decks.length, "deck")}
            </p>
            <h1 className="title" id="progress-title">
              Progress
            </h1>
          </div>
          <div className="head__side">
            <StreakBadge streak={p.streak} monday={monday} today={p.today} heatmap={p.heatmap} />
          </div>
        </div>

        <section className="stats" aria-label="Progress summary">
          <Figure
            dot="young"
            label="Learned"
            value={p.percent}
            unit="%"
            caption={`${learned} of ${totalCards} graduated`}
          />
          <Figure
            dot="streak"
            label="Streak"
            value={p.streak}
            caption={p.streak === 1 ? "day in a row" : "days in a row"}
          />
          <Figure
            dot="recall"
            label="Recall"
            value={p.recall === null ? "—" : p.recall}
            unit={p.recall === null ? undefined : "%"}
            caption="answers not Again, last 30 days"
          />
          <Figure dot="learning" label="Today" value={p.reviewsToday} caption="cards answered" />
        </section>
      </section>

      <section className="panel" aria-labelledby="memory-title">
        <div className="section-head">
          <h2 className="section-title" id="memory-title">
            Memory state
          </h2>
          <span className="meta">{plural(totalCards, "card")}</span>
        </div>
        <MemoryBar memory={memory} />
        <MemoryLabels memory={memory} detailed />
      </section>

      <section className="panel" aria-labelledby="activity-title">
        {/* The grid drops its older half when the panel is too narrow for a
            year of days, so the heading has the figure for either width. */}
        <div className="section-head">
          <h2 className="section-title" id="activity-title">
            Activity
          </h2>
          <span className="meta">
            <span className="activity__wide">
              <strong className="num">{total(0)}</strong> reviews in the past year
            </span>
            <span className="activity__narrow">
              <strong className="num">{total(WEEKS - NARROW_WEEKS)}</strong> reviews in{" "}
              {NARROW_WEEKS} weeks
            </span>
            {busiest.count > 0 && ` · busiest ${dateLabel(busiest.day)} (${busiest.count})`}
          </span>
        </div>
        <div className="heatmap">
          <div className="heatmap__inner" role="img" aria-label="Answers per day">
            <div className="heatmap__months" aria-hidden="true">
              {months.map((month, w) => (
                <span key={w} className={older(w)}>
                  {month}
                </span>
              ))}
            </div>
            <div className="heatmap__days" aria-hidden="true">
              {WEEKDAYS.map((name, d) => (
                <span key={d}>{name}</span>
              ))}
            </div>
            <div className="heatmap__grid">
              {weeks.map((week, w) => (
                <div key={week[0].day} className={`heatmap__week ${older(w)}`.trim()}>
                  {week.map(({ day, count }) =>
                    count < 0 ? (
                      <i key={day} data-future="" />
                    ) : (
                      <i
                        key={day}
                        data-level={shade.level(count)}
                        title={`${dateLabel(day)} · ${reviews(count)}`}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="heatmap-legend" aria-hidden="true">
          {shade.ranges.map((range, level) => (
            <span key={level}>
              <i data-level={level} />
              {range}
            </span>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="deck-progress-title">
        <div className="section-head">
          <h2 className="section-title" id="deck-progress-title">
            By deck
          </h2>
        </div>
        <div className="table t-progress">
          <div className="table__inner">
            <div className="table__head" aria-hidden="true">
              <span className="cell-name">Deck</span>
              <span className="c-bar">Learned</span>
              <span className="cell-num">Cards</span>
              <span className="cell-num">%</span>
              <span className="cell-num">Recall</span>
            </div>
            <div className="table__body">
              {/* Weakest first — the page's answer to "what should I work on". */}
              {p.decks.map((deck) => {
                const { counts } = deck;
                return (
                  <Link key={deck.id} href={`/decks/${deck.id}`} className="table__row">
                    <span className="cell-name">
                      <StatusMark status={counts.status} />
                      <span>
                        <strong className="row-name">{deck.name}</strong>
                        <small className="row-sub">
                          <RowNote counts={counts} at={at} />
                        </small>
                      </span>
                    </span>
                    <span
                      className="bar c-bar"
                      role="img"
                      aria-label={`${counts.learned} of ${counts.cards} learned`}
                    >
                      {counts.learned > 0 && (
                        <i className="seg-young" style={{ flexGrow: counts.learned }} />
                      )}
                      {counts.cards > counts.learned && (
                        <i style={{ flexGrow: counts.cards - counts.learned }} />
                      )}
                    </span>
                    <span className="cell-num cell-num--quiet">
                      {counts.learned} / {counts.cards}
                    </span>
                    <span className="cell-num c-pct">{counts.percent}%</span>
                    <span
                      className={
                        counts.status === "struggling" ? "cell-num cell-num--flag" : "cell-num"
                      }
                    >
                      {counts.recall === null ? "—" : `${counts.recall}%`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * The streak, said as information rather than drawn as a prize: a flame, the
 * count, and this week so far — a dot per day, filled for each you studied,
 * ringed for today.
 */
function StreakBadge({
  streak,
  monday,
  today,
  heatmap,
}: {
  streak: number;
  monday: number;
  today: number;
  heatmap: Record<number, number>;
}) {
  const days = DAY_NAMES.map((name, i) => {
    const day = monday + i;
    const done = (heatmap[day] ?? 0) > 0;
    return { name, day, done, isToday: day === today };
  });
  const studied = days.filter((d) => d.done).map((d) => (d.isToday ? "today" : d.name));
  const label = `${streak}-day streak.${
    studied.length > 0 ? ` Studied this week: ${studied.join(", ")}.` : ""
  }`;

  return (
    <div className="streak-badge" role="img" aria-label={label}>
      <span className="streak-badge__flame" aria-hidden="true">
        <Icon name="flame" />
      </span>
      <span className="streak-badge__count" aria-hidden="true">
        <strong>{streak}</strong>
        <small>day streak</small>
      </span>
      <i className="streak-badge__rule" aria-hidden="true" />
      <span className="streak-badge__week" aria-hidden="true">
        {days.map((d) => (
          <i
            key={d.day}
            title={`${d.name}${d.isToday ? " · today" : ""}${d.done ? " · studied" : ""}`}
            className={[d.done ? "is-done" : "", d.isToday ? "is-today" : ""].join(" ").trim() || undefined}
          />
        ))}
      </span>
    </div>
  );
}

function older(w: number): string {
  return w < WEEKS - NARROW_WEEKS ? "heatmap__week--older" : "";
}

/** A day number is a calendar date; read back through UTC it is that date,
 * whatever zone the day was counted in. */
function dateLabel(day: number): string {
  const date = new Date(day * DAY_MS);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
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
    if (at === 0) return "0";
    const range = bounds[at];
    if (!range) return "—";
    return range.min === range.max ? String(range.max) : `${range.min}–${range.max}`;
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
