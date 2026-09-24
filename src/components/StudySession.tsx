"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Inline from "./Inline";
import Points from "./Points";
import Icon from "./Icon";
import type { List } from "@/lib/parse";

export type StudyItem = {
  id: string;
  title: string;
  points: List;
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

/** Again: the only grade that puts a card back in the queue. */
const AGAIN = 1;
/** Again and Hard. Neither counts as getting the card. */
const SHAKY = new Set([1, 2]);

/** More marks than this and the bar stops being a row of cards and starts
 * being a haze; past it one mark stands for several. */
const MAX_MARKS = 30;

/**
 * What has become of a card this session. Unanswered cards have no entry.
 *
 * "Shaky" is Again or Hard: neither is an answer you got cleanly, and the bar
 * should not paint them the same green as one you did. Only Again brings the
 * card back — Hard is recorded, not repeated.
 */
type Outcome = "solved" | "shaky";

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
  /** How each card has gone so far. A card you did not get cleanly stays that
   * way until you do, which is what keeps its mark orange. */
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  /** How many times each card has already come back this session. A card that
   * appears here was failed at least once, whatever became of it later. */
  const [returns, setReturns] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = cards[0];
  /* Fixed for the life of the session: the cards the server dealt. Deriving it
     from answers + remaining made the denominator climb every time a card was
     re-queued, which is where "14 / 17" in a five-card topic came from. */
  const total = queue.length;
  /* A card's place is its place in the queue it was dealt from, so coming back
     to one you failed takes the count back to it rather than inventing a new
     position for a card you have already seen. */
  const place = current ? queue.findIndex((card) => card.id === current.id) : total;
  const answered = Object.keys(outcomes).length;
  const shaky = Object.values(outcomes).filter((o) => o === "shaky").length;

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
        setOutcomes((all) => ({
          ...all,
          [current.id]: SHAKY.has(rating) ? "shaky" : "solved",
        }));
        if (comesBack) {
          setReturns((seen) => ({ ...seen, [current.id]: (seen[current.id] ?? 0) + 1 }));
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
      // Enter on a focused link or button is that control's own — a link in
      // the question opens rather than revealing the answer underneath it.
      if (e.key === "Enter" && target?.closest("a, button")) return;
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
    if (answered === 0) {
      return (
        <div className="centered-message">
          <h1>Nothing to study</h1>
          <p>{what} has no cards yet.</p>
          <div className="centered-message__actions">
            <Link href={backHref} className="ghost-action">
              Back to {backLabel}
            </Link>
            <Link href="/import" className="primary-action">
              <Icon name="import" />
              Import cards
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="centered-message">
        <h1>Session complete</h1>
        <p>
          You answered {answered} card{answered === 1 ? "" : "s"} in {what}.
          {shaky > 0 && ` ${shaky} did not come cleanly.`}
          {remaining > 0 && ` ${remaining} more are waiting.`}
        </p>
        <div className="centered-message__actions">
          <Link href={backHref} className="ghost-action">
            Back to {backLabel}
          </Link>
          <Link href={nextRoundHref ?? backHref} className="primary-action">
            <Icon name="play" />
            {remaining > 0 ? "Keep going" : "Study again"}
          </Link>
        </div>
      </div>
    );
  }

  const marks = sessionMarks(queue, outcomes, place);

  return (
    <section className="study-screen">
      <header className="review-toolbar">
        <Link href={backHref} className="back-link">
          ← {backLabel}
        </Link>
        <div className="review-progress" aria-label={`Card ${place + 1} of ${total}`}>
          <span>
            {place + 1} / {total}
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
            Card {place + 1} / {total}
          </span>
        </div>
        <h1>
          <Inline>{current.title}</Inline>
        </h1>

        {revealed ? (
          <>
            <div className="review-divider" aria-hidden="true" />
            <Points list={current.points} className="review-answer" />
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

      {/* The grades are always in the layout, hidden until the answer is. If
          they only appeared on reveal the card would be one height before it
          and another after, and a different height again on the next card —
          which is the card resizing between questions. `visibility` keeps the
          space and still takes them out of the tab order and the a11y tree. */}
      <div className={`rating-slot${revealed ? "" : " is-waiting"}`} aria-hidden={!revealed}>
        <div className="rating-grid" aria-label="Rate this answer">
          {GRADES.map((grade) => (
            <button
              key={grade.rating}
              type="button"
              className={`rating rating--${grade.tone}`}
              disabled={pending || !revealed}
              tabIndex={revealed ? undefined : -1}
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
      </div>
    </section>
  );
}

/**
 * The session as a row of marks: what you got, what you did not, where you
 * are, and what is left. Past `MAX_MARKS` one mark stands for several cards,
 * and the worst news among them wins — a card you struggled with should not be
 * hidden by the two beside it that you did not.
 */
function sessionMarks(
  queue: StudyItem[],
  outcomes: Record<string, Outcome>,
  place: number,
): string[] {
  const total = queue.length;
  const n = Math.min(total, MAX_MARKS);
  const slots: string[] = Array.from({ length: n }, () => "");
  const rank = { "": 0, "is-complete": 1, "is-shaky": 2, "is-current": 3 } as const;

  queue.forEach((card, i) => {
    const slot = Math.min(n - 1, Math.floor((i * n) / total));
    const state =
      i === place ? "is-current" : outcomes[card.id] === "shaky" ? "is-shaky"
      : outcomes[card.id] === "solved" ? "is-complete" : "";
    if (rank[state] > rank[slots[slot] as keyof typeof rank]) slots[slot] = state;
  });
  return slots;
}
