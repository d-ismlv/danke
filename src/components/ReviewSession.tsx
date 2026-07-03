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
}: {
  deckId: string;
  deckName: string;
  initialQueue: QueueItem[];
}) {
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [pending, setPending] = useState(false);

  const current = queue[0];
  const done = !current;

  const answer = useCallback(
    async (rating: Grade) => {
      if (!current || pending) return;
      setPending(true);
      const result = await gradeCard(current.id, rating);
      setReviewed((n) => n + 1);
      setRevealed(false);
      setQueue((q) => {
        const [, ...rest] = q;
        // Re-queue while the card is still in (re)learning — it hasn't
        // graduated to a multi-day interval yet, so show it again this session.
        const stillLearning =
          result?.state === State.Learning || result?.state === State.Relearning;
        if (result && stillLearning) {
          return [...rest, { ...current, previews: result.previews }];
        }
        return rest;
      });
      setPending(false);
    },
    [current, pending],
  );

  // Keyboard: space/enter reveals; 1–4 grade.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed) {
        const b = BUTTONS.find((b) => b.key === e.key);
        if (b) {
          e.preventDefault();
          void answer(b.rating);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, done, answer]);

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-semibold">Session complete</h1>
        <p className="text-muted">
          You reviewed {reviewed} card{reviewed === 1 ? "" : "s"} in {deckName}.
        </p>
        <div className="mt-2 flex gap-2">
          <Link
            href={`/decks/${deckId}`}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2"
          >
            Back to deck
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
          >
            All decks
          </Link>
        </div>
      </div>
    );
  }

  const remaining = queue.length;

  return (
    <div className="flex min-h-[70vh] flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted">
        <Link href={`/decks/${deckId}`} className="hover:text-foreground">
          ← {deckName}
        </Link>
        <span>
          {reviewed} done · {remaining} left
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{
            width: `${(reviewed / (reviewed + remaining || 1)) * 100}%`,
          }}
        />
      </div>

      {/* Card */}
      <button
        type="button"
        onClick={() => !revealed && setRevealed(true)}
        className="flex flex-1 cursor-pointer flex-col rounded-2xl border border-border bg-surface p-6 text-left"
      >
        <div className="flex-1">
          <Markdown>{current.front || "*(empty)*"}</Markdown>
        </div>
        {revealed && (
          <>
            <hr className="my-5 border-border" />
            <div className="flex-1">
              <Markdown>{current.back || "*(empty)*"}</Markdown>
            </div>
          </>
        )}
        {!revealed && (
          <div className="mt-6 text-center text-sm text-muted">
            Tap or press <kbd className="font-mono">space</kbd> to reveal
          </div>
        )}
      </button>

      {/* Grades */}
      {revealed && (
        <div className="grid grid-cols-4 gap-2">
          {BUTTONS.map((b) => (
            <button
              key={b.rating}
              disabled={pending}
              onClick={() => answer(b.rating)}
              className="flex flex-col items-center gap-0.5 rounded-xl border border-border bg-surface py-3 text-sm font-medium transition hover:bg-surface-2 disabled:opacity-50"
              style={{ borderTopColor: b.color, borderTopWidth: 3 }}
            >
              <span>{b.label}</span>
              <span className="text-xs text-muted">
                {current.previews[b.rating] ?? ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
