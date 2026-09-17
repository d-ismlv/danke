"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Inline from "./Inline";
import Icon from "./Icon";

export type StudyItem = {
  id: string;
  title: string;
  points: string[];
};

const GRADES = [
  { rating: 1, name: "Again", tone: "again" },
  { rating: 2, name: "Hard", tone: "hard" },
  { rating: 3, name: "Good", tone: "good" },
  { rating: 4, name: "Easy", tone: "easy" },
] as const;

/** Card states ts-fsrs has not finished with: they come back this session. */
const LEARNING = new Set([1, 3]);

/**
 * How many times one card may come back inside a single session.
 *
 * Only an **Again** brings a card back. Learning state alone will not do it:
 * a brand-new card graded Good is still in learning — that is what the first
 * learning step *is* — so re-queueing on state meant that after a fresh
 * import nothing ever left the queue, and a session of nine cards showed
 * "Card 1 / 9" for all nine of them. Good and Hard move a card on; Again is
 * the answer that means you have not got past it yet.
 */
const MAX_RETURNS = 2;

/** Again. The only grade that puts a card back in the queue. */
const AGAIN = 1;

/** More marks than this and the session bar stops being a row of cards and
 * starts being a haze; past it each mark stands for a share of the queue. */
const MAX_MARKS = 30;

export default function StudySession({
  what,
  backHref,
  backLabel,
  nextRoundHref,
  queue,
  remaining,
}: {
  /** What is being studied — a topic, a deck, or everything. Used when the
   * session ends, not while it is running. */
  what: string;
  backHref: string;
  /** What `backHref` leads to, named as the link should read. */
  backLabel: string;
  /** Set when more cards are waiting than one session holds. */
  nextRoundHref?: string;
  queue: StudyItem[];
  /** Cards in scope beyond this session's queue. */
  remaining: number;
}) {
  const [cards, setCards] = useState(queue);
  const [revealed, setRevealed] = useState(false);
  /** Distinct cards finished — not answers given. A card that comes back has
   * not been finished, so seeing it again does not move this. */
  const [done, setDone] = useState(0);
  /** How many times each card has already come back this session. */
  const [returns, setReturns] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = cards[0];
  /* Fixed for the life of the session: the cards the server dealt. Deriving it
     from done + remaining made the denominator climb every time a card was
     re-queued, which is where "14 / 17" in a five-card topic came from. */
  const total = queue.length;

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
        const result: { state: number } = await res.json();
        // Only so many times, or a card you keep failing never lets the
        // session end.
        const comesBack =
          rating === AGAIN &&
          LEARNING.has(result.state) &&
          (returns[current.id] ?? 0) < MAX_RETURNS;
        setRevealed(false);
        setCards(([, ...rest]) => (comesBack ? [...rest, current] : rest));
        if (comesBack) {
          setReturns((seen) => ({ ...seen, [current.id]: (seen[current.id] ?? 0) + 1 }));
        } else {
          setDone((n) => n + 1);
        }
      } catch {
        setError("Couldn't reach the app. The card is still here; try again.");
      } finally {
        setPending(false);
      }
    },
    [current, pending, returns],
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
      if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        void answer(Number(e.key));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, current, answer]);

  if (!current) {
    return (
      <div className="centered-message">
        <h1>{done > 0 ? "Session complete" : "Nothing to study"}</h1>
        <p>
          {done > 0 ? (
            <>
              You answered {done} card{done === 1 ? "" : "s"} in {what}.
              {remaining > 0 && ` ${remaining} more are waiting.`}
            </>
          ) : (
            <>{what} has no cards yet.</>
          )}
        </p>
        <div className="centered-message__actions">
          <Link href={backHref} className="ghost-action">
            Back to {backLabel}
          </Link>
          {remaining > 0 && nextRoundHref && (
            <Link href={nextRoundHref} className="primary-action">
              <Icon name="play" />
              Keep going
            </Link>
          )}
          {done === 0 && (
            <Link href="/import" className="primary-action">
              <Icon name="import" />
              Import cards
            </Link>
          )}
        </div>
      </div>
    );
  }

  const marks = sessionMarks(done, total);

  return (
    <section className="study-screen">
      <header className="review-toolbar">
        <Link href={backHref} className="back-link">
          ← {backLabel}
        </Link>
        <div className="review-progress" aria-label={`Card ${done + 1} / ${total}`}>
          <span>
            {done + 1} / {total}
          </span>
          <div style={{ "--n": marks.length } as React.CSSProperties} aria-hidden="true">
            {marks.map((mark, i) => (
              <i key={i} className={mark} />
            ))}
          </div>
        </div>
      </header>

      <article className="review-card">
        <div className="review-card__meta">
          <span>
            Card {done + 1} / {total}
          </span>
        </div>
        <h1>
          <Inline>{current.title}</Inline>
        </h1>

        {revealed ? (
          <>
            <div className="review-divider" aria-hidden="true" />
            <ul className="review-answer">
              {current.points.map((point, i) => (
                <li key={i}>
                  <Inline>{point}</Inline>
                </li>
              ))}
            </ul>
          </>
        ) : (
          /* The answer is asked for, not handed over: recalling it is the
             whole exercise. The reveal sits where the divider and the points
             will be, so nothing above it moves when they arrive. */
          <div className="reveal-row">
            <button
              type="button"
              className="primary-action"
              onClick={() => setRevealed(true)}
              aria-keyshortcuts="Space"
            >
              Show answer
            </button>
          </div>
        )}
      </article>

      {revealed && (
        <>
          <div className="rating-grid" aria-label="Rate this answer">
            {GRADES.map((grade) => (
              <button
                key={grade.rating}
                type="button"
                className={`rating rating--${grade.tone}`}
                disabled={pending}
                onClick={() => answer(grade.rating)}
                aria-keyshortcuts={String(grade.rating)}
              >
                <span className="rating-label">
                  <span className="rating-key">{grade.rating}</span>
                  <strong>{grade.name}</strong>
                </span>
              </button>
            ))}
          </div>
          <p aria-live="polite" className="review-error">
            {error}
          </p>
        </>
      )}
    </section>
  );
}

/**
 * The session as a row of marks: what is behind you, where you are, what is
 * left. Past `MAX_MARKS` each mark stands for a share of the queue rather than
 * one card, so a long session still reads as one glance.
 */
function sessionMarks(done: number, total: number): string[] {
  const n = Math.min(total, MAX_MARKS);
  const current = Math.floor((done / total) * n);
  return Array.from({ length: n }, (_, i) =>
    i < current ? "is-complete" : i === current ? "is-current" : "",
  );
}
