"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Markdown from "./Markdown";
import { Rating, State, type Grade } from "@/lib/fsrs";
import type { ReviewResult } from "@/lib/review";

export type QueueItem = {
  id: string;
  front: string;
  back: string;
  previews: Record<number, string>;
};

async function gradeCard(cardId: string, rating: Grade): Promise<ReviewResult | null> {
  const res = await fetch("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, rating }),
  });
  if (!res.ok) return null;
  return res.json();
}

const BUTTONS: { rating: Grade; label: string; key: string; color: string }[] = [
  { rating: Rating.Again, label: "Again", key: "1", color: "var(--again)" },
  { rating: Rating.Hard, label: "Hard", key: "2", color: "var(--hard)" },
  { rating: Rating.Good, label: "Good", key: "3", color: "var(--good)" },
  { rating: Rating.Easy, label: "Easy", key: "4", color: "var(--easy)" },
];

export default function ReviewSession({
  deckId,
  deckName,
  initialQueue,
  practice = false,
}: {
  deckId: string;
  deckName: string;
  initialQueue: QueueItem[];
  practice?: boolean;
}) {
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = queue[0];
  const done = !current;

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
    [current, pending],
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
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-good/10 text-2xl">
          ✓
        </div>
        <p className="eyebrow">Finished</p>
        <h1 className="display-title text-3xl sm:text-4xl">Session complete</h1>
        <p className="text-muted">
          You {practice ? "practiced" : "reviewed"} {reviewed} card
          {reviewed === 1 ? "" : "s"} in {deckName}.
        </p>
        <div className="mt-2 flex gap-2">
          <Link
            href={`/decks/${deckId}`}
            className="button-secondary"
          >
            Back to deck
          </Link>
          <Link
            href="/"
            className="button-primary"
          >
            All decks
          </Link>
        </div>
      </div>
    );
  }

  const remaining = queue.length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      {/* Progress */}
      <div className="flex items-end justify-between gap-4 text-sm text-muted">
        <div>
          <p className="eyebrow mb-1">{practice ? "Practice" : "Review"}</p>
          <Link
            href={`/decks/${deckId}`}
            className="text-base font-semibold text-foreground hover:text-accent"
          >
            {deckName}
          </Link>
        </div>
        <span>
          {reviewed} done · {remaining} left
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{
            width: `${(reviewed / (reviewed + remaining || 1)) * 100}%`,
          }}
        />
      </div>

      {/* Card */}
      <section className="panel flex min-h-72 flex-col p-5 text-left sm:p-6">
        <div>
          <Markdown variant="review">{current.front || "*(empty)*"}</Markdown>
        </div>
        {revealed && (
          <>
            <hr className="my-5 border-border" />
            <div>
              <Markdown variant="review">
                {current.back || "*(empty)*"}
              </Markdown>
            </div>
          </>
        )}
        {!revealed && (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="button-primary mx-auto mt-auto min-w-36"
          >
            Show answer <span className="ml-1 text-xs">Space</span>
          </button>
        )}
      </section>

      {/* Grades */}
      {revealed && practice && (
        <button
          type="button"
          onClick={advancePractice}
          className="button-primary ml-auto min-w-32"
        >
          Next <span className="ml-1 text-xs">Space</span>
        </button>
      )}

      {revealed && !practice && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BUTTONS.map((b) => (
              <button
                key={b.rating}
                disabled={pending}
                onClick={() => answer(b.rating)}
                className="flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-surface py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-surface-2 disabled:opacity-50"
                style={{ borderBottomColor: b.color, borderBottomWidth: 3 }}
              >
                <span>{b.label}</span>
                <span className="text-xs text-muted">
                  {current.previews[b.rating] ?? ""}
                </span>
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
