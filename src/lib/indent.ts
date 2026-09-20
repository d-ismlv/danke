"use client";

import { useRef } from "react";

/** One level, and the width both editors draw a tab at. */
const INDENT = "  ";

/** An edit to a textarea: what to replace, and where to leave the selection. */
export type Shift = { from: number; to: number; text: string; start: number; end: number };

/**
 * Indent or outdent every line a selection touches.
 *
 * Whole lines, even when the cursor sits in the middle of one: indentation is
 * the thing being edited here, and a Tab that dropped two spaces into the
 * middle of a point would be answering a question nobody asked.
 *
 * Pure, and separate from the field it will be applied to — where the
 * selection lands afterwards is the fiddly half of this, and it is much easier
 * to be sure of when it is arithmetic rather than a side effect.
 */
export function shift(value: string, start: number, end: number, out: boolean): Shift | null {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const ends = value.indexOf("\n", end);
  const to = ends === -1 ? value.length : ends;

  const block = value.slice(from, to);
  const lines = block.split("\n");
  const shifted = lines.map((line) =>
    out ? line.replace(/^(\t| {1,2})/, "") : INDENT + line,
  );
  const text = shifted.join("\n");
  if (text === block) return null;

  // Hold the selection over the same text it was on, now that the lines in
  // front of it are wider or narrower: the line the selection opens on moves
  // by its own change, and the line it closes on by every change above it.
  return {
    from,
    to,
    text,
    start: Math.max(from, start + shifted[0].length - lines[0].length),
    end: Math.max(from, end + text.length - block.length),
  };
}

/**
 * Tab indents, in the two boxes where points are written.
 *
 * A textarea hands Tab to the browser, which moves focus — reasonable
 * everywhere else, and useless in a box whose format uses indentation to mean
 * something. So Tab shifts the lines the cursor is on, and Shift-Tab shifts
 * them back.
 *
 * Escape first, then Tab, still leaves the field. Taking Tab away with no way
 * to give it back would strand anyone moving through the form by keyboard, and
 * this is the convention for that: one key, always available, no pointer.
 */
export function useIndent() {
  const leaving = useRef(false);

  return function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      leaving.current = true;
      return;
    }
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) {
      leaving.current = false;
      return;
    }
    if (leaving.current) {
      leaving.current = false;
      return;
    }

    const field = event.currentTarget;
    const edit = shift(field.value, field.selectionStart, field.selectionEnd, event.shiftKey);
    event.preventDefault();
    if (!edit) return;

    field.setSelectionRange(edit.from, edit.to);
    /* Deprecated, and still the only way to edit a textarea without emptying
       its undo stack — Cmd-Z after a Tab should put back the line, not the
       whole paste before it. `setRangeText` is the fallback for browsers that
       have finished removing it; React hears either, since both raise
       `input`. */
    let replaced = false;
    try {
      replaced = document.execCommand("insertText", false, edit.text);
    } catch {
      replaced = false;
    }
    if (!replaced) {
      field.setRangeText(edit.text, edit.from, edit.to);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }
    field.setSelectionRange(edit.start, edit.end);
  };
}
