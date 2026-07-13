"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { deleteCard, resetCardProgress } from "@/lib/actions";
import { State } from "@/lib/fsrs";

type BrowserCard = {
  id: string;
  front: string;
  back: string;
  due: number | null;
  state: number | null;
};

type Filter = "all" | "due" | "new" | "learning" | "review";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "due", label: "Due" },
  { value: "new", label: "New" },
  { value: "learning", label: "Learning" },
  { value: "review", label: "Review" },
];

const STATE_LABEL: Record<number, string> = {
  [State.New]: "New",
  [State.Learning]: "Learning",
  [State.Review]: "Review",
  [State.Relearning]: "Relearning",
};

function matchesFilter(card: BrowserCard, filter: Filter, now: number): boolean {
  if (filter === "all") return true;
  if (filter === "due") return card.due !== null && card.due <= now;
  if (filter === "new") return (card.state ?? State.New) === State.New;
  if (filter === "learning") {
    return card.state === State.Learning || card.state === State.Relearning;
  }
  return card.state === State.Review;
}

export default function CardBrowser({
  cards,
  deckId,
  now,
}: {
  cards: BrowserCard[];
  deckId: string;
  now: number;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return cards.filter((card) => {
      const matchesQuery =
        !needle ||
        card.front.toLocaleLowerCase().includes(needle) ||
        card.back.toLocaleLowerCase().includes(needle);
      return matchesQuery && matchesFilter(card, filter, now);
    });
  }, [cards, filter, now, query]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">Search cards</span>
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          >
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path d="m12.5 12.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cards"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </label>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-surface-2 p-1">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                filter === item.value
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-muted" aria-live="polite">
        Showing {filtered.length} of {cards.length}
      </div>

      {filtered.length === 0 ? (
        <div className="panel px-5 py-10 text-center">
          <p className="font-semibold">No matching cards</p>
          <p className="mt-1 text-sm text-muted">
            Try a different search or scheduling filter.
          </p>
        </div>
      ) : (
        <ul className="panel divide-y divide-border overflow-hidden">
          {filtered.map((card) => {
            const due = card.due !== null && card.due <= now;
            return (
              <li
                key={card.id}
                className="group flex flex-col gap-3 px-4 py-4 transition hover:bg-surface-2/50 sm:flex-row sm:items-start sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-3 text-sm leading-6">
                    <Markdown variant="compact">
                      {card.front || "*(empty front)*"}
                    </Markdown>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <span
                      className={
                        due
                          ? "rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent"
                          : "rounded-full bg-surface-2 px-2 py-0.5"
                      }
                    >
                      {STATE_LABEL[card.state ?? State.New] ?? "New"}
                    </span>
                    {due && <span>due now</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <Link
                    href={`/decks/${deckId}/review?mode=practice&cardId=${card.id}`}
                    className="button-secondary min-h-9 px-2.5"
                  >
                    Practice
                  </Link>
                  <Link
                    href={`/decks/${deckId}/cards/${card.id}`}
                    className="button-quiet min-h-9 px-2.5"
                  >
                    Edit
                  </Link>
                  <form action={resetCardProgress}>
                    <input type="hidden" name="id" value={card.id} />
                    <input type="hidden" name="deckId" value={deckId} />
                    <ConfirmSubmitButton
                      message="Reset this card to New and remove its review history?"
                      className="button-quiet min-h-9 px-2.5"
                    >
                      Reset
                    </ConfirmSubmitButton>
                  </form>
                  <form action={deleteCard}>
                    <input type="hidden" name="id" value={card.id} />
                    <input type="hidden" name="deckId" value={deckId} />
                    <ConfirmSubmitButton
                      message="Delete this card? Its review history will also be removed."
                      className="button-danger min-h-9 px-2.5"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
