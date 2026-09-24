import Link from "next/link";
import { getProgress, now } from "@/lib/queries";
import { statusLabel, type MemoryState } from "@/lib/status";
import { StatusMark } from "@/components/Marks";

export const dynamic = "force-dynamic";
export const metadata = { title: "Progress" };

const DAY_MS = 86_400_000;
/** Half a year, which is what the six month labels across the top describe. */
const WEEKS = 26;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MEMORY: { key: MemoryState; label: string }[] = [
  { key: "mature", label: "Mature" },
  { key: "young", label: "Young" },
  { key: "learning", label: "Learning" },
  { key: "unseen", label: "Unseen" },
];

/** Four bands of activity, so a quiet day and a long one are told apart at a
 * glance without the scale needing a legend. */
function level(count: number): 0 | 1 | 2 | 3 {
  if (count === 0) return 0;
  if (count < 5) return 1;
  if (count < 15) return 2;
  return 3;
}

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

  const startDay = p.today - WEEKS * 7 + 1;
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const day = startDay + i;
    return { day, count: day <= p.today ? (p.heatmap[day] ?? 0) : -1 };
  });
  const months = monthLabels(startDay, WEEKS);
  const windowTotal = cells.reduce((sum, cell) => sum + Math.max(0, cell.count), 0);
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
        <div className="progress-hero__stat">
          <span>Streak</span>
          <strong>{p.streak}</strong>
          <p>{p.streak === 1 ? "day in a row" : "days in a row"}</p>
        </div>
        <div className="progress-hero__stat">
          <span>Recall</span>
          <strong>{p.recall === null ? "—" : `${p.recall}%`}</strong>
          <p>last 30 days</p>
        </div>
        <div className="progress-hero__stat">
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
        <header className="section-heading">
          <div>
            <p className="eyebrow">Past {WEEKS} weeks</p>
            <h2 id="activity-title">Activity</h2>
          </div>
          <span>
            {windowTotal} review{windowTotal === 1 ? "" : "s"}
          </span>
        </header>
        <div
          className="heatmap-months"
          style={{ "--n": months.length } as React.CSSProperties}
          aria-hidden="true"
        >
          {months.map((month, i) => (
            <span key={i}>{month}</span>
          ))}
        </div>
        <div className="heatmap" aria-label={`Study activity for the last ${WEEKS} weeks`}>
          {cells.map(({ day, count }) =>
            count < 0 ? (
              <i key={day} aria-hidden="true" />
            ) : (
              <i
                key={day}
                data-level={level(count)}
                // A day number is a calendar date; read back through UTC it
                // is that date, whatever zone the day was counted in.
                title={`${new Date(day * DAY_MS).toISOString().slice(0, 10)} · ${count} review${count === 1 ? "" : "s"}`}
              />
            ),
          )}
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

/**
 * One label per month the window touches, in order. A 26-week window spans six
 * or seven months; when it is seven, the first is a few days of a month that
 * has mostly scrolled off, so it is the one to drop.
 */
function monthLabels(startDay: number, weeks: number): string[] {
  const seen: number[] = [];
  for (let w = 0; w < weeks; w++) {
    const month = new Date((startDay + w * 7) * DAY_MS).getUTCMonth();
    if (seen[seen.length - 1] !== month) seen.push(month);
  }
  return seen.slice(-6).map((m) => MONTHS[m]);
}
