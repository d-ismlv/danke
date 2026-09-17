import Link from "next/link";
import { getProgress, now } from "@/lib/queries";
import Meter from "@/components/Meter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Progress" };

const DAY_MS = 86_400_000;
const WEEKS = 53;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Three questions, in three bands of one grid: how much do I know, am I showing
 * up, and which deck is weakest.
 *
 * Everything else the database could say has been left out on purpose. A page
 * that answers three questions well is read; a page of eleven figures is
 * glanced at and closed.
 */
const MEMORY = [
  { key: "mature", label: "Mature", tint: "var(--accent)" },
  { key: "young", label: "Young", tint: "color-mix(in srgb, var(--accent) 55%, var(--surface-2))" },
  { key: "learning", label: "Learning", tint: "color-mix(in srgb, var(--accent) 25%, var(--surface-2))" },
  { key: "unseen", label: "Unseen", tint: "var(--surface-2)" },
] as const;

function heat(count: number): string {
  if (!count) return "var(--surface-2)";
  if (count < 5) return "color-mix(in srgb, var(--accent) 28%, var(--surface-2))";
  if (count < 15) return "color-mix(in srgb, var(--accent) 55%, var(--surface-2))";
  if (count < 30) return "color-mix(in srgb, var(--accent) 80%, var(--surface-2))";
  return "var(--accent)";
}

export default async function ProgressPage() {
  const p = await getProgress(now());
  const { memory, totalCards } = p;

  if (totalCards === 0) {
    return (
      <div className="flex flex-col gap-7">
        <h1 className="h-page">Progress</h1>
        <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">Nothing to measure yet</h2>
          <p className="max-w-sm text-sm text-muted text-pretty">
            Import some cards and study them — this page fills in from the first answer.
          </p>
          <Link href="/import" className="btn-primary mt-1">
            Import cards
          </Link>
        </div>
      </div>
    );
  }

  const startDay = p.today - WEEKS * 7 + 1;
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const day = startDay + i;
    return { day, count: day <= p.today ? (p.heatmap[day] ?? 0) : -1 };
  });
  const monthLabels = Array.from({ length: WEEKS }, (_, w) => {
    const date = new Date((startDay + w * 7) * DAY_MS);
    const before = w === 0 ? null : new Date((startDay + (w - 1) * 7) * DAY_MS);
    return !before || before.getUTCMonth() !== date.getUTCMonth() ? MONTHS[date.getUTCMonth()] : "";
  });
  const yearTotal = Object.values(p.heatmap).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="h-page mb-2">Progress</h1>

      {/* How much do I know */}
      <section className="panel grid gap-6 p-6 sm:p-7 md:grid-cols-[minmax(0,13rem)_1fr] md:items-center md:gap-10">
        <div>
          <p className="h-section">Learned</p>
          <p className="num mt-2 text-[2.6rem] font-semibold leading-none tracking-[-0.045em]">
            {p.percent}%
          </p>
          <p className="num mt-2 text-sm text-muted">
            {memory.mature + memory.young} of {totalCards} cards holding
          </p>
        </div>

        <div>
          <div
            className="flex h-2.5 overflow-hidden rounded-full bg-surface-2"
            role="img"
            aria-label="Card memory"
          >
            {MEMORY.map((m) => (
              <span
                key={m.key}
                style={{ width: `${(memory[m.key] / totalCards) * 100}%`, background: m.tint }}
              />
            ))}
          </div>
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            {MEMORY.map((m) => (
              <div key={m.key} className="min-w-16">
                <dt className="flex items-center gap-1.5 text-xs text-muted">
                  <span
                    className={`size-2 shrink-0 rounded-[2px] ${
                      m.key === "unseen" ? "ring-1 ring-border-strong" : ""
                    }`}
                    style={{ background: m.tint }}
                  />
                  {m.label}
                </dt>
                <dd className="num mt-1 text-lg font-semibold leading-none">{memory[m.key]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Am I showing up */}
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <Figure label="Streak" value={p.streak} note={p.streak === 0 ? "start one" : "days in a row"} />
        <Figure label="Today" value={p.reviewsToday} note="cards answered" />
        <Figure
          label="Recall"
          value={p.recall === null ? "—" : `${p.recall}%`}
          note="last 30 days"
        />
      </section>

      <section className="panel p-6 sm:p-7">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="h-section">Activity</h2>
          <p className="num text-xs text-muted">
            {yearTotal} review{yearTotal === 1 ? "" : "s"} in the past year
          </p>
        </div>
        <div>
          <div>
            <div
              className="mb-1.5 hidden gap-[3px] text-[10px] leading-3 text-faint sm:grid"
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
              className="heat"
              style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}
            >
              {cells.map(({ day, count }) =>
                count < 0 ? (
                  <span key={day} className="heat-cell" aria-hidden="true" />
                ) : (
                  <button
                    key={day}
                    type="button"
                    className="heat-cell"
                    style={{ background: heat(count) }}
                    title={`${new Date(day * DAY_MS).toISOString().slice(0, 10)} · ${count} review${count === 1 ? "" : "s"}`}
                    aria-label={`${new Date(day * DAY_MS).toISOString().slice(0, 10)}: ${count} reviews`}
                  />
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Which deck is weakest */}
      {p.decks.length > 0 && (
        <section className="panel overflow-hidden">
          <div className="flex items-baseline justify-between gap-3 border-b px-6 py-4">
            <h2 className="h-section">By deck</h2>
            <div className="hidden items-baseline gap-x-5 text-xs text-muted sm:flex">
              <span className="w-14 text-right">learned</span>
              <span className="w-14 text-right">recall</span>
            </div>
          </div>
          <ul className="divide-hairline">
            {p.decks.map((deck) => (
              <li key={deck.id}>
                <Link
                  href={`/decks/${deck.id}`}
                  className="grid gap-x-5 gap-y-2 px-6 py-4 transition-colors hover:bg-surface-2/50 sm:grid-cols-[14rem_1fr_auto_auto] sm:items-center"
                >
                  <span className="truncate text-sm font-medium">{deck.name}</span>
                  <Meter percent={deck.percent} />
                  {/* The two figures have a header to sit under from `sm` up.
                      Narrower than that there is no room for one, so the row
                      says which is which itself rather than leaving two bare
                      percentages to be guessed at. */}
                  <span className="num text-xs text-muted sm:hidden">
                    {deck.percent}% learned ·{" "}
                    <span className="font-semibold" style={{ color: recallTint(deck.recall) }}>
                      {deck.recall === null ? "—" : `${deck.recall}%`} recall
                    </span>
                  </span>
                  <span className="num hidden w-14 text-right text-sm text-muted sm:block">
                    {deck.percent}%
                  </span>
                  <span
                    className="num hidden w-14 text-right text-sm font-semibold sm:block"
                    style={{ color: recallTint(deck.recall) }}
                    title="Recall over the last 30 days"
                  >
                    {deck.recall === null ? "—" : `${deck.recall}%`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Recall is read against the schedule, not against zero: below about 75% the
 * intervals are outrunning you, and the low end is the only one worth a colour. */
function recallTint(recall: number | null): string {
  if (recall === null) return "var(--text-faint)";
  if (recall < 75) return "var(--again)";
  if (recall < 85) return "var(--hard)";
  return "var(--text)";
}

function Figure({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="panel flex flex-col gap-2.5 p-4 sm:gap-3 sm:p-6">
      <p className="h-section truncate">{label}</p>
      <p className="num text-[1.7rem] font-semibold leading-none tracking-[-0.04em] sm:text-[2.1rem]">
        {value}
      </p>
      <p className="text-xs text-muted text-pretty">{note}</p>
    </div>
  );
}
