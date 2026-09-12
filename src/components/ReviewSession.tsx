"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import Markdown from "./Markdown";
import Icon from "./Icon";
import { Rating, State, type Grade } from "@/lib/fsrs";
import { RUNG_NAMES } from "@/lib/import";
import type { ReviewResult } from "@/lib/review";

export type QueueItem = {
  id: string;
  front: string;
  back: string;
  /** Ladder position, when the card belongs to a concept. */
  rung?: number | null;
  previews: Record<number, string>;
};

/**
 * `review` grades a due queue, `practice` never touches scheduling, and
 * `drill` walks one concept's ladder in order and stops at the first Again —
 * the rung where recall actually ran out.
 */
export type SessionMode = "review" | "practice" | "drill";

async function gradeCard(cardId: string, rating: Grade): Promise<ReviewResult | null> {
  const res = await fetch("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, rating }),
  });
  if (!res.ok) return null;
  return res.json();
}

const BUTTONS: { rating: Grade; label: string; key: string; color: string; tint: string }[] = [
  { rating: Rating.Again, label: "Again", key: "1", color: "var(--again)", tint: "var(--again-tint)" },
  { rating: Rating.Hard, label: "Hard", key: "2", color: "var(--hard)", tint: "var(--hard-tint)" },
  { rating: Rating.Good, label: "Good", key: "3", color: "var(--good)", tint: "var(--good-tint)" },
  { rating: Rating.Easy, label: "Easy", key: "4", color: "var(--easy)", tint: "var(--easy-tint)" },
];

export default function ReviewSession({
  title,
  subtitle,
  backHref,
  initialQueue,
  mode = "review",
  conceptId,
}: {
  title: string;
  subtitle?: string;
  backHref: string;
  initialQueue: QueueItem[];
  mode?: SessionMode;
  /** Drill only — the concept being climbed. */
  conceptId?: string;
}) {
  const practice = mode === "practice";
  const drill = mode === "drill";

  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Drill only: what each rung did this session. */
  const [climbed, setClimbed] = useState<Record<number, "passed" | "edge">>({});
  const [edge, setEdge] = useState<number | null>(null);

  const current = queue[0];
  const done = !current || edge !== null;
  const remaining = queue.length;

  /** The rungs this drill covers, for the rail down the side of the card. */
  const rungs = useMemo(
    () => initialQueue.map((c) => c.rung).filter((r): r is number => typeof r === "number"),
    [initialQueue],
  );

  /**
   * Walk the ladder again from rung 1.
   *
   * This was a `<Link>` to the drill's own URL, which App Router treats as a
   * no-op navigation: the route never changes, so this component is never
   * remounted and the `edge` that put the summary on screen is never cleared.
   * The button did nothing. Restarting is local state, so it says so.
   */
  const restart = useCallback(() => {
    setQueue(initialQueue);
    setClimbed({});
    setEdge(null);
    setReviewed(0);
    setRevealed(false);
    setError(null);
    setPending(false);
  }, [initialQueue]);

  const advancePractice = useCallback(() => {
    if (!current) return;
    setReviewed((n) => n + 1);
    setRevealed(false);
    setError(null);
    setQueue((q) => q.slice(1));
  }, [current]);

  const answer = useCallback(
    async (rating: Grade) => {
      if (!current || pending) return;
      setPending(true);
      setError(null);
      try {
        const result = await gradeCard(current.id, rating);
        if (!result) {
          setError("Could not save that review. Your card is still here—try again.");
          return;
        }
        setReviewed((n) => n + 1);
        setRevealed(false);

        if (drill && typeof current.rung === "number") {
          const failed = rating === Rating.Again;
          setClimbed((c) => ({ ...c, [current.rung as number]: failed ? "edge" : "passed" }));
          // The drill stops at the first rung missed: that rung is the edge,
          // and everything above it would be answered on a shaken footing.
          if (failed) {
            setEdge(current.rung);
            return;
          }
          setQueue((q) => q.slice(1));
          return;
        }

        setQueue((q) => {
          const [, ...rest] = q;
          // Re-queue while the card is still in (re)learning — it hasn't
          // graduated to a multi-day interval yet, so show it again this session.
          const stillLearning =
            result.state === State.Learning || result.state === State.Relearning;
          if (stillLearning) {
            return [...rest, { ...current, previews: result.previews }];
          }
          return rest;
        });
      } catch {
        setError("Could not reach the app. Your card is still here—try again.");
      } finally {
        setPending(false);
      }
    },
    [current, pending, drill],
  );

  // Keyboard: space/enter reveals (and advances practice); 1–4 grade reviews.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed) {
        if (practice && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          advancePractice();
          return;
        }
        const b = BUTTONS.find((b) => b.key === e.key);
        if (!practice && b) {
          e.preventDefault();
          void answer(b.rating);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, done, practice, answer, advancePractice]);

  if (done) {
    const stopped = edge !== null;
    return (
      <div className="anim-rise mx-auto flex w-full max-w-xl flex-col items-center gap-3 py-10 text-center">
        <div
          className={`flex size-14 items-center justify-center rounded-xl ${
            stopped ? "bg-again-tint text-again" : "bg-good-tint text-good"
          }`}
        >
          <Icon name={stopped ? "target" : "check"} size={26} />
        </div>
        <p className="eyebrow">{stopped ? "Edge found" : "Finished"}</p>
        <h1 className="display-title text-2xl sm:text-3xl">
          {stopped
            ? `Rung ${edge} — ${RUNG_NAMES[edge!] ?? ""}`
            : drill
              ? "Ladder complete"
              : "Session complete"}
        </h1>
        <p className="max-w-md text-pretty text-muted">
          {stopped ? (
            <>
              That is the rung to re-read. It comes back on its own schedule; the
              rungs below it stay quiet.
            </>
          ) : drill ? (
            <>
              All {reviewed} rung{reviewed === 1 ? "" : "s"} of{" "}
              <span className="font-medium text-foreground">{conceptId}</span> answered.
            </>
          ) : (
            <>
              You {practice ? "practiced" : "reviewed"} {reviewed} card
              {reviewed === 1 ? "" : "s"} in {title}.
            </>
          )}
        </p>

        {drill && rungs.length > 0 && (
          <ol className="mt-2 flex flex-wrap justify-center gap-1.5">
            {rungs.map((r) => (
              <li
                key={r}
                className="rung-cell"
                data-state={climbed[r] ?? "unseen"}
                title={`Rung ${r} — ${RUNG_NAMES[r] ?? ""}`}
              >
                {r}
              </li>
            ))}
          </ol>
        )}

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Link href={backHref} className="button-secondary">
            <Icon name="arrowLeft" size={15} />
            {drill ? "Edge map" : "Back to deck"}
          </Link>
          {drill ? (
            <button type="button" onClick={restart} className="button-primary">
              <Icon name="practice" size={15} />
              Drill again
            </button>
          ) : (
            <Link href="/" className="button-primary">
              <Icon name="decks" size={15} />
              All decks
            </Link>
          )}
        </div>
      </div>
    );
  }

  const rung = typeof current.rung === "number" ? current.rung : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {/* Progress */}
      <div className="flex items-end justify-between gap-4 text-sm text-muted">
        <div className="min-w-0">
          <p className="eyebrow mb-1">
            {drill ? "Drill" : practice ? "Practice" : "Review"}
          </p>
          <Link
            href={backHref}
            className="transition-state block truncate text-base font-semibold text-foreground hover:text-accent"
          >
            {title}
          </Link>
          {subtitle && <p className="truncate text-xs">{subtitle}</p>}
        </div>
        <span className="numeral shrink-0 text-xs sm:text-sm">
          {reviewed} done · {remaining} left
        </span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${(reviewed / (reviewed + remaining || 1)) * 100}%` }}
        />
      </div>

      {/* Card */}
      <section key={current.id} className="stage anim-rise flex min-h-[15rem] flex-col p-5 sm:p-6">
        {rung !== null && (
          <div className="mb-4 flex items-center gap-3">
            <span className="chip chip-accent">
              <Icon name="ladder" size={12} />
              Rung {rung} · {RUNG_NAMES[rung] ?? ""}
            </span>
            {drill && rungs.length > 0 && (
              <ol className="flex flex-1 gap-1" aria-label="Ladder progress">
                {rungs.map((r) => (
                  <li
                    key={r}
                    className="rung-dot flex-1"
                    data-state={climbed[r] ?? (r === rung ? "current" : "unseen")}
                    title={`Rung ${r} — ${RUNG_NAMES[r] ?? ""}`}
                  />
                ))}
              </ol>
            )}
          </div>
        )}

        <div className="stage-question">
          <Markdown variant="review">{current.front || "*(empty)*"}</Markdown>
        </div>

        {revealed && (
          <div className="anim-settle mt-5 border-t border-border pt-5">
            <Markdown variant="review">{current.back || "*(empty)*"}</Markdown>
          </div>
        )}

        {!revealed && (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            aria-keyshortcuts="Space"
            className="button-primary mx-auto mt-auto min-w-40"
          >
            Show answer
            <span className="keycap ml-1 border-transparent bg-black/15 text-accent-fg">
              Space
            </span>
          </button>
        )}
      </section>

      {/* Grades */}
      {revealed && practice && (
        <button type="button" onClick={advancePractice} className="button-primary ml-auto min-w-32">
          Next
          <span className="keycap ml-1 border-transparent bg-black/15 text-accent-fg">Space</span>
        </button>
      )}

      {revealed && !practice && (
        <div className="anim-settle flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BUTTONS.map((b) => (
              <button
                key={b.rating}
                disabled={pending}
                onClick={() => answer(b.rating)}
                style={
                  {
                    "--grade-color": b.color,
                    "--grade-tint": b.tint,
                  } as CSSProperties
                }
                className="grade"
              >
                <span className="flex items-center gap-1.5">
                  <span className="keycap">{b.key}</span>
                  <span className="grade-label">{b.label}</span>
                </span>
                <span className="grade-hint">{current.previews[b.rating] ?? ""}</span>
              </button>
            ))}
          </div>
          <p aria-live="polite" className="min-h-5 text-center text-sm text-again">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
