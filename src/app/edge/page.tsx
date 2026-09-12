import Link from "next/link";
import {
  getConceptLadders,
  ladderSummary,
  MAX_RUNG,
  RUNG_NAMES,
  type ConceptLadder,
} from "@/lib/ladder";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

const RUNGS = Array.from({ length: MAX_RUNG }, (_, i) => i + 1);

const BANDS: { label: string; rungs: string; hint: string }[] = [
  { label: "1–2", rungs: "1-2", hint: "Name and mechanism" },
  { label: "3–5", rungs: "3-5", hint: "Prerequisites to breaks" },
  { label: "6–7", rungs: "6-7", hint: "Detection and advice" },
];

function Summary({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="min-w-28 flex-1 border-l border-border px-4 py-1 first:border-l-0 first:pl-0">
      <div className="display-title numeral text-2xl sm:text-3xl">{value}</div>
      <div className="label mt-1">{label}</div>
    </div>
  );
}

function LadderRow({ ladder }: { ladder: ConceptLadder }) {
  const byRung = new Map(ladder.rungs.map((r) => [r.rung, r]));
  return (
    <li className="row flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-5">
      <div className="min-w-44 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{ladder.conceptId}</span>
          {ladder.edge === null && (
            <span className="chip chip-good">
              <Icon name="check" size={12} />
              standing
            </span>
          )}
          {ladder.dueCount > 0 && (
            <span className="chip chip-accent">
              <Icon name="clock" size={12} />
              {ladder.dueCount} due
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {ladder.edge === null
            ? `All ${ladder.cardCount} rungs answered`
            : ladder.highest === 0
              ? `Not drilled yet · ${ladder.cardCount} rungs`
              : `Holds to rung ${ladder.highest} · edge at ${ladder.edge} (${RUNG_NAMES[ladder.edge] ?? ""})`}
        </p>
      </div>

      <ol className="flex gap-1" aria-label={`Rungs for ${ladder.conceptId}`}>
        {RUNGS.map((n) => {
          const rung = byRung.get(n);
          const state = !rung
            ? "missing"
            : rung.state === "passed"
              ? "passed"
              : rung.state === "edge"
                ? "edge"
                : ladder.edge === n
                  ? "current"
                  : "unseen";
          return (
            <li
              key={n}
              className={`rung-cell ${state === "missing" ? "opacity-35" : ""}`}
              data-state={state}
              title={
                rung
                  ? `Rung ${n} — ${RUNG_NAMES[n]}: ${
                      rung.state === "passed"
                        ? "passed"
                        : rung.state === "edge"
                          ? "missed last time"
                          : "not drilled yet"
                    }`
                  : `Rung ${n} — ${RUNG_NAMES[n]}: no card`
              }
            >
              {n}
            </li>
          );
        })}
      </ol>

      <Link
        href={`/drill/${encodeURIComponent(ladder.conceptId)}`}
        className={ladder.dueCount > 0 ? "button-primary min-h-9 px-3" : "button-secondary min-h-9 px-3"}
      >
        <Icon name="target" size={14} />
        Drill
      </Link>
    </li>
  );
}

export default async function EdgePage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const status = await searchParams;
  const ladders = await getConceptLadders();
  const { concepts, complete, climbed, rungs, due } = ladderSummary(ladders);
  const imported = Number(status.created ?? 0) + Number(status.updated ?? 0);

  // Grouped by deck, because the rung-band pass ("rungs 1–2 across AD") is a
  // deck-level route and this is where you decide to take one.
  const groups = new Map<string, { deckName: string; ladders: ConceptLadder[] }>();
  for (const ladder of ladders) {
    const group =
      groups.get(ladder.deckId) ??
      groups.set(ladder.deckId, { deckName: ladder.deckName, ladders: [] }).get(ladder.deckId)!;
    group.ladders.push(ladder);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Recall</p>
          <h1 className="display-title text-3xl sm:text-4xl">Edge map</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Every concept, and the first rung its ladder stops at. Weakest first —
            that rung is what to read before drilling it again.
          </p>
        </div>
        <Link href="/edge/import" className="button-secondary">
          <Icon name="import" size={15} />
          Import ladders
        </Link>
      </header>

      {imported > 0 && (
        <div
          role="status"
          className="anim-settle flex items-center gap-2 rounded-xl border border-good/25 bg-good-tint px-4 py-3 text-sm font-medium text-good"
        >
          <Icon name="check" size={16} />
          {status.created !== "0" && `${status.created} card${status.created === "1" ? "" : "s"} added`}
          {status.created !== "0" && status.updated !== "0" && " · "}
          {status.updated !== "0" &&
            `${status.updated} updated (schedules kept)`}
        </div>
      )}

      {ladders.length === 0 ? (
        <EmptyEdge />
      ) : (
        <>
          <div className="panel flex flex-wrap gap-y-4 px-4 py-5 sm:px-6">
            <Summary value={concepts} label="Concepts" />
            <Summary value={`${climbed}/${rungs}`} label="Rungs standing" />
            <Summary value={complete} label="Full ladders" />
            <Summary value={due} label="Due now" />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="rung-cell size-4 min-w-0" data-state="passed" /> passed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="rung-cell size-4 min-w-0" data-state="edge" /> missed last time
            </span>
            <span className="flex items-center gap-1.5">
              <span className="rung-cell size-4 min-w-0" data-state="current" /> next up
            </span>
            <span className="flex items-center gap-1.5">
              <span className="rung-cell size-4 min-w-0" /> not drilled
            </span>
            <span className="ml-auto hidden sm:inline">
              1 Name · 2 Mechanism · 3 Prerequisites · 4 Boundaries · 5 Breaks · 6
              Detection · 7 Advice
            </span>
          </div>

          {[...groups.entries()].map(([deckId, group]) => (
            <section key={deckId} className="panel overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2/60 px-4 py-3 sm:px-5">
                <Link
                  href={`/decks/${deckId}`}
                  className="transition-state flex items-center gap-2 text-sm font-semibold hover:text-accent"
                >
                  <Icon name="decks" size={16} />
                  {group.deckName}
                </Link>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="label mr-1 hidden sm:inline">Band pass</span>
                  {BANDS.map((band) => (
                    <Link
                      key={band.rungs}
                      href={`/decks/${deckId}/review?rungs=${band.rungs}`}
                      title={`${band.hint} — due cards only`}
                      className="button-secondary min-h-8 px-2.5 py-1 text-xs"
                    >
                      {band.label}
                    </Link>
                  ))}
                </div>
              </div>
              <ul className="divide-y divide-border">
                {group.ladders.map((ladder) => (
                  <LadderRow key={ladder.conceptId} ladder={ladder} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function EmptyEdge() {
  return (
    <div className="panel flex flex-col items-center gap-4 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-accent-tint text-accent">
        <Icon name="ladder" size={22} />
      </div>
      <div>
        <h2 className="text-lg font-semibold">No ladders yet</h2>
        <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-muted">
          A ladder is one concept drilled through seven rungs — name, mechanism,
          prerequisites, boundaries, breaks, detection, advice. Import a concept
          file and each rung becomes a card that FSRS schedules on its own.
        </p>
      </div>
      <pre className="mono w-full max-w-lg overflow-x-auto rounded-xl border border-border bg-surface-2 p-4 text-left leading-6">
        {`---
concept: kerberos.roasting
deck: AD / Kerberos
---

## 1 :: What is Kerberoasting?
Offline password attack against **service accounts**.

## 2 :: Why does it work?
- Any authenticated principal can request a ticket for **any SPN**
- Part of it is encrypted with the account's **long-term key**`}
      </pre>
      <Link href="/edge/import" className="button-primary">
        <Icon name="import" size={15} />
        Import ladders
      </Link>
    </div>
  );
}
