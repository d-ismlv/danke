"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import Inline from "./Inline";
import Icon from "./Icon";
import Meter from "./Meter";

export type StudyItem = {
  id: string;
  title: string;
  points: string[];
  topicName: string;
  /** How far each grade would push the card, e.g. `{ 3: "10m" }`. */
  previews: Record<number, string>;
};

const GRADES = [
  { rating: 1, name: "Again", key: "1", hue: "var(--again)" },
  { rating: 2, name: "Hard", key: "2", hue: "var(--hard)" },
  { rating: 3, name: "Good", key: "3", hue: "var(--good)" },
  { rating: 4, name: "Easy", key: "4", hue: "var(--easy)" },
] as const;

/** Card states ts-fsrs has not finished with: they come back this session. */
const LEARNING = new Set([1, 3]);

export default function StudySession({
  what,
  where,
  backHref,
  backLabel,
  nextRoundHref,
  queue,
  remaining,
  showTopic,
}: {
  /** What is being studied — a topic, a deck, or everything. */
  what: string;
  /** Where that sits, when it sits inside something. */
  where?: string;
  backHref: string;
  /** What `backHref` leads to, named as the link should read. */
  backLabel: string;
  /** Set when more cards are waiting than one session holds. */
  nextRoundHref?: string;
  queue: StudyItem[];
  /** Cards in scope beyond this session's queue. */
  remaining: number;
  showTopic: boolean;
}) {
  const [cards, setCards] = useState(queue);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = cards[0];
  const left = cards.length;

  const answer = useCallback(
    async (rating: number) => {
      if (!current || pending) return;
      setPending(true);
      setError(null);
      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: current.id, rating }),
        });
        if (res.status === 401) {
          setError("Your session expired. Sign in again — this card will still be here.");
          return;
        }
        if (!res.ok) {
          setError("That answer didn't save. The card is still here; try again.");
          return;
        }
        const result: { state: number; previews: Record<number, string> } = await res.json();
        setDone((n) => n + 1);
        setRevealed(false);
        setCards(([, ...rest]) =>
          // A card still in learning hasn't earned an interval yet, so it comes
          // back before the session ends rather than tomorrow.
          LEARNING.has(result.state)
            ? [...rest, { ...current, previews: result.previews }]
            : rest,
        );
      } catch {
        setError("Couldn't reach the app. The card is still here; try again.");
      } finally {
        setPending(false);
      }
    },
    [current, pending],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+1 is "go to the first tab". Grading a card on the way out of
      // the app is not what that shortcut is for.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return;
      }
      if (!current) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed) {
        const grade = GRADES.find((g) => g.key === e.key);
        if (grade) {
          e.preventDefault();
          void answer(grade.rating);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, current, answer]);

  if (!current) {
    return (
      <div className="anim-rise mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon name="check" size={26} />
        </span>
        <h1 className="h-page">{done > 0 ? "Session complete" : "Nothing to study"}</h1>
        <p className="text-muted">
          {done > 0 ? (
            <>
              You answered {done} card{done === 1 ? "" : "s"} in{" "}
              <span className="font-medium text-text">{what}</span>.
              {remaining > 0 && ` ${remaining} more are waiting.`}
            </>
          ) : (
            <>
              <span className="font-medium text-text">{what}</span> has no cards yet. Import some
              to get started.
            </>
          )}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link href={backHref} className="btn">
            Back to {backLabel}
          </Link>
          {remaining > 0 && nextRoundHref && (
            <Link href={nextRoundHref} className="btn-primary">
              <Icon name="play" size={14} />
              Keep going
            </Link>
          )}
          {done === 0 && (
            <Link href="/import" className="btn-primary">
              <Icon name="import" size={15} />
              Import cards
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[var(--stage-width)] flex-col gap-3.5">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={backHref}
            className="block truncate text-[0.95rem] font-semibold transition-colors hover:text-accent"
          >
            {what}
          </Link>
          {where && <p className="truncate text-xs text-muted">{where}</p>}
        </div>
        <p className="num shrink-0 text-sm text-muted">
          <span className="font-semibold text-text">{done}</span> / {done + left}
        </p>
      </div>

      <Meter percent={(done / (done + left)) * 100} />

      <section
        key={current.id}
        /* The floor is for the question on its own: without it a one-line
           question is a letterbox, and the card jumps a long way when the
           answer arrives. Revealed, the points set the height — a two-point
           card that held its full height would be a third of it empty. */
        className={`stage anim-rise flex flex-col px-6 py-7 sm:px-12 sm:py-11 ${
          revealed ? "" : "min-h-[19rem] sm:min-h-[21rem]"
        }`}
      >
        {showTopic && (
          <p className="h-section mb-3 truncate">{current.topicName}</p>
        )}

        <h1 className="stage-title">
          <Inline>{current.title}</Inline>
        </h1>

        {revealed ? (
          <div className="anim-fade mt-7 border-t pt-7">
            <ol className="points" data-count={current.points.length}>
              {current.points.map((point, i) => (
                <li key={i} className="point">
                  <b>{String(i + 1).padStart(2, "0")}</b>
                  <span>
                    <Inline>{point}</Inline>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            aria-keyshortcuts="Space"
            className="btn-primary btn-lg mx-auto mt-auto w-full max-w-64"
          >
            Show answer
            <span className="kbd border-transparent bg-black/15 text-[inherit] opacity-80">Space</span>
          </button>
        )}
      </section>

      {revealed && (
        <div className="anim-fade flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map((g) => (
              <button
                key={g.rating}
                type="button"
                disabled={pending}
                onClick={() => answer(g.rating)}
                style={{ "--grade": g.hue } as CSSProperties}
                className="grade"
              >
                <span className="flex items-center gap-1.5">
                  <span className="kbd">{g.key}</span>
                  <span className="grade-name">{g.name}</span>
                </span>
                <span className="grade-when">{current.previews[g.rating] ?? ""}</span>
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
