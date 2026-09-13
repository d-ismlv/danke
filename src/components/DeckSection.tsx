"use client";

import { useId, useState } from "react";
import Icon from "./Icon";

/**
 * One deck's worth of the edge map, with its list foldable.
 *
 * The whole map is 49 concepts across a dozen decks, and a deck you are not
 * working on is a screen of rows between you and the one you are. Collapsing
 * one has to leave it still saying something, so the summary that only shows
 * when it is shut carries the two figures you would have gone looking for:
 * how many concepts, and how many of their rungs are waiting.
 *
 * Open is the default and the state is not persisted. It is a way of reading
 * the page, not a setting — and a remembered fold is the kind of thing that
 * has you hunting for a deck you cannot see three weeks later.
 */
export default function DeckSection({
  name,
  title,
  concepts,
  due,
  actions,
  children,
}: {
  /** The deck's name in plain text, for the toggle's tooltip and its label. */
  name: string;
  /** The same name as rendered — a link to the deck, which the fold leaves alone. */
  title: React.ReactNode;
  concepts: number;
  due: number;
  /** The band-pass links: they belong to the deck, not to the fold. */
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const id = useId();

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls={id}
            title={`${open ? "Collapse" : "Expand"} ${name}`}
            aria-label={`${open ? "Collapse" : "Expand"} ${name}`}
            className="button-quiet size-7 shrink-0 justify-center p-0"
          >
            {/* One glyph, turned: a chevron that rotates is the same object
                moving, where swapping in a second glyph is two objects. */}
            <span
              className={`transition-state block ${open ? "" : "-rotate-90"}`}
              aria-hidden="true"
            >
              <Icon name="chevronDown" size={16} />
            </span>
          </button>
          {title}
          {!open && (
            <span className="truncate text-xs text-muted">
              {concepts} concept{concepts === 1 ? "" : "s"}
              {due > 0 && ` · ${due} due`}
            </span>
          )}
        </div>
        {actions}
      </div>
      {/* The list itself is built on the server and arrives as one element.
          Handing this component the mapped array as `children` instead trips
          React's key validation as the array crosses the boundary, even though
          every row is keyed. */}
      <div id={id} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
