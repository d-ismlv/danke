"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Inline from "./Inline";
import Points from "./Points";
import Icon from "./Icon";
import { Figure } from "./Figures";
import { formatInterval } from "@/lib/interval";
import type { List } from "@/lib/parse";

export type StudyItem = {
  id: string;
  title: string;
  points: List;
  /** The topic the card belongs to, named on the card. */
  topic: string;
  /** Why it is in the queue: its review has come round, it has never been
   * seen, or it is being studied ahead of its schedule. */
  kind: "due" | "new" | "ahead";
  /** How long Again, Hard, Good and Easy would put it away, in ms. */
  intervals: number[];
};

const KIND_LABEL: Record<StudyItem["kind"], string> = {
  due: "Due",
  new: "New",
  ahead: "Ahead of schedule",
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

/** More segments than this and the bar stops being a row of cards and starts
 * being a haze; past it one segment stands for several. */
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
   * way until you do, which is what keeps its segment marigold. */
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  /** How many times each card has already come back this session. A card that
   * appears here was failed at least once, whatever became of it later. */
  const [returns, setReturns] = useState<Record<string, number>>({});
  /** A card that came back carries its new schedule's intervals, not the ones
   * it was dealt with. */
  const [intervals, setIntervals] = useState<Record<string, number[]>>({});
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);

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
      setNote(null);
      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: current.id, rating }),
        });
        if (res.status === 401) {
          setNote({ text: "Your session expired. Sign in again — this card will still be here.", error: true });
          return;
        }
        if (!res.ok) {
          setNote({ text: "That answer didn't save. The card is still here; try again.", error: true });
          return;
        }
        const result: { state: number; intervals: number[] } = await res.json();
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
          setIntervals((all) => ({ ...all, [current.id]: result.intervals }));
          setNote({ text: `This ${current.topic} card comes back before the session ends.`, error: false });
        }
      } catch {
        setNote({ text: "Couldn't reach the app. The card is still here; try again.", error: true });
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

  const bar = (
    <header className="session-bar">
      <div className="session-bar__inner">
        <Link href={backHref} className="btn btn--ghost flush-start session-bar__back">
          <Icon name="back" />
          <span>{backLabel}</span>
        </Link>
        <span
          className="bar"
          role="img"
          aria-label={current ? `Card ${place + 1} of ${total}` : `All ${total} cards answered`}
        >
          {sessionMarks(queue, outcomes, current ? place : -1).map((mark, i) => (
            <i key={i} className={mark || undefined} />
          ))}
        </span>
        <p className="session-bar__count">
          {pad(current ? place + 1 : total)} / {pad(total)}
        </p>
      </div>
    </header>
  );

  if (!current) {
    if (answered === 0) {
      return (
        <section className="session">
          {bar}
          <div className="panel done">
            <p className="eyebrow">Nothing to study</p>
            <h1 className="title">{what} has no cards yet.</h1>
            <div className="done__actions">
              <Link href={backHref} className="btn btn--secondary">
                Back to {backLabel}
              </Link>
              <Link href="/import" className="btn btn--primary">
                <Icon name="import" />
                Import cards
              </Link>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="session">
        {bar}
        <div className="panel done">
          <p className="eyebrow">Session complete</p>
          <h1 className="title">
            {answered} card{answered === 1 ? "" : "s"} answered in {what}.
          </h1>
          <div className="stats">
            <Figure dot="recall" label="Answered" value={answered} />
            <Figure dot="young" label="Clean" value={answered - shaky} />
            <Figure dot="learning" label="Not clean" value={shaky} />
            <Figure dot="unseen" label="Still waiting" value={remaining} />
          </div>
          <p className="done__summary">
            {shaky > 0
              ? `${shaky} did not come cleanly — they are scheduled sooner, so they come round first next time.`
              : "Every card came cleanly."}
            {remaining > 0 ? ` ${remaining} more are waiting.` : ` Nothing else in ${what} is waiting.`}
          </p>
          <div className="done__actions">
            <Link href={backHref} className="btn btn--secondary">
              Back to {backLabel}
            </Link>
            <Link href={nextRoundHref ?? backHref} className="btn btn--primary">
              <Icon name="play" className="icon--fill" />
              {remaining > 0 ? "Keep going" : "Study again"}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const shown = intervals[current.id] ?? current.intervals;

  return (
    <section className="session">
      {bar}
      <div className="study">
        <article className="study-card">
          <p className="study-card__meta no-copy">
            <span className="study-card__topic">{current.topic}</span>
            <span className={`study-card__kind--${current.kind}`}>{KIND_LABEL[current.kind]}</span>
          </p>
          <h1 className="study-card__question">
            <Inline>{current.title}</Inline>
          </h1>
          {revealed && (
            <>
              <div className="study-card__divider" aria-hidden="true" />
              <Points list={current.points} />
            </>
          )}
        </article>

        {/* The answer is asked for, not handed over: recalling it is the whole
            exercise. Show answer and the four grades share one slot of one
            height, so nothing on the screen moves when one replaces the other. */}
        <div className="study-actions no-copy">
          {revealed ? (
            <div className="grades" role="group" aria-label="Rate this answer">
              {GRADES.map((grade, i) => (
                <button
                  key={grade.rating}
                  type="button"
                  className={`grade grade--${grade.tone}`}
                  disabled={pending}
                  onClick={() => answer(grade.rating)}
                  aria-keyshortcuts={String(grade.rating)}
                >
                  <kbd className="grade__key">{grade.rating}</kbd>
                  <strong className="grade__name">{grade.name}</strong>
                  {shown[i] !== undefined && (
                    <span className="grade__interval">{formatInterval(shown[i])}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--wide"
              onClick={() => setRevealed(true)}
              aria-keyshortcuts="Space"
            >
              Show answer
              <kbd className="kbd-chip">Space</kbd>
            </button>
          )}
        </div>

        <p
          aria-live="polite"
          className={note?.error ? "study-note study-note--error" : "study-note"}
        >
          {note?.text}
        </p>
      </div>
    </section>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * The session as a row of segments: what you got, what you did not, where you
 * are, and what is left. Past `MAX_MARKS` one segment stands for several
 * cards, and the worst news among them wins — a card you struggled with
 * should not be hidden by the two beside it that you did not.
 */
function sessionMarks(
  queue: StudyItem[],
  outcomes: Record<string, Outcome>,
  place: number,
): string[] {
  const total = queue.length;
  const n = Math.min(total, MAX_MARKS);
  const slots: string[] = Array.from({ length: n }, () => "");
  const rank = { "": 0, "seg-solved": 1, "seg-shaky": 2, "seg-current": 3 } as const;

  queue.forEach((card, i) => {
    const slot = Math.min(n - 1, Math.floor((i * n) / total));
    const state =
      i === place ? "seg-current" : outcomes[card.id] === "shaky" ? "seg-shaky"
      : outcomes[card.id] === "solved" ? "seg-solved" : "";
    if (rank[state] > rank[slots[slot] as keyof typeof rank]) slots[slot] = state;
  });
  return slots;
}
