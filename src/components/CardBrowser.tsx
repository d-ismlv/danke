"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { deleteCard, resetCardProgress } from "@/lib/actions";
import { State } from "@/lib/fsrs";
import { RUNG_NAMES } from "@/lib/import";
import Icon from "@/components/Icon";

type BrowserCard = {
  id: string;
  front: string;
  back: string;
  due: number | null;
  state: number | null;
  conceptId?: string | null;
  rung?: number | null;
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
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Icon name="search" size={16} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cards"
            className="input input-icon"
          />
        </label>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-surface-2 p-1">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={`transition-state shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                filter === item.value
                  ? "bg-surface text-foreground shadow-[var(--shadow-soft)]"
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
                className="row group flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-3 text-sm leading-6">
                    <Markdown variant="compact">
                      {card.front || "*(empty front)*"}
                    </Markdown>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span className={due ? "chip chip-due" : "chip"}>
                      {STATE_LABEL[card.state ?? State.New] ?? "New"}
                    </span>
                    {due && <span>due now</span>}
                    {typeof card.rung === "number" && (
                      <span className="chip" title={card.conceptId ?? undefined}>
                        <Icon name="ladder" size={12} />
                        {card.conceptId} · {card.rung} {RUNG_NAMES[card.rung] ?? ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <Link
                    href={`/decks/${deckId}/review?mode=practice&cardId=${card.id}`}
                    className="button-secondary min-h-9 px-2.5"
                    title="Practice this card without changing its schedule"
                  >
                    <Icon name="practice" size={14} />
                    <span className="sr-only sm:not-sr-only">Practice</span>
                  </Link>
                  <Link
                    href={`/decks/${deckId}/cards/${card.id}`}
                    className="button-quiet min-h-9 px-2.5"
                    title="Edit card"
                  >
                    <Icon name="pencil" size={14} />
                    <span className="sr-only sm:not-sr-only">Edit</span>
                  </Link>
                  <form action={resetCardProgress}>
                    <input type="hidden" name="id" value={card.id} />
                    <input type="hidden" name="deckId" value={deckId} />
                    <ConfirmSubmitButton
                      message="Reset this card to New and remove its review history?"
                      className="button-quiet min-h-9 px-2.5"
                    >
                      <Icon name="reset" size={14} />
                      <span className="sr-only sm:not-sr-only">Reset</span>
                    </ConfirmSubmitButton>
                  </form>
                  <form action={deleteCard}>
                    <input type="hidden" name="id" value={card.id} />
                    <input type="hidden" name="deckId" value={deckId} />
                    <ConfirmSubmitButton
                      message="Delete this card? Its review history will also be removed."
                      className="button-danger min-h-9 px-2.5"
                    >
                      <Icon name="trash" size={14} />
                      <span className="sr-only sm:not-sr-only">Delete</span>
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
