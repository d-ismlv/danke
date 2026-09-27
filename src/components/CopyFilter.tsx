"use client";

import { useEffect } from "react";

/**
 * Leaves `.no-copy` out of every copy.
 *
 * A card is copied for its words: the question and its points. The row they
 * sit in says more than that — its number, how the card is going, the tools
 * under an open answer — and a drag across a card picked all of it up, so a
 * pasted question arrived as "01 What is … DUE" with "Edit card Delete" after
 * its answer.
 *
 * The class makes those parts unselectable, which is most of the fix but not
 * all of it: Chrome leaves unselectable text out of the plain text it copies
 * and still writes it into the HTML beside it, and the HTML is what a notes
 * app or a document pastes. So when a selection takes in anything marked, the
 * copy is written here instead — the same selection with those parts taken
 * out. A selection that takes in none of them is left to the browser.
 */
export default function CopyFilter() {
  useEffect(() => {
    document.addEventListener("copy", leaveOut);
    return () => document.removeEventListener("copy", leaveOut);
  }, []);
  return null;
}

function leaveOut(event: ClipboardEvent) {
  // A field copies its own text, and nothing inside one is marked.
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA)$/.test(target.tagName))
  ) {
    return;
  }
  const selection = document.getSelection();
  if (!event.clipboardData || !selection || selection.isCollapsed) return;

  const copy = document.createElement("div");
  for (let i = 0; i < selection.rangeCount; i++) {
    const part = document.createElement("div");
    part.append(selection.getRangeAt(i).cloneContents());
    copy.append(part);
  }
  const marked = copy.querySelectorAll(".no-copy");
  if (marked.length === 0) return;
  marked.forEach((node) => node.remove());
  // A question is drawn inside its row's toggle; pasted into a rich editor, a
  // button's words would come back as a button.
  copy.querySelectorAll("button").forEach((button) => button.replaceWith(...button.childNodes));

  /* innerText, because it is what puts the question and each point on a line
     of their own — and it only does that for something laid out, so the copy
     is laid out, off-screen, for as long as it takes to read it. */
  copy.style.cssText = "position: fixed; inset-block-start: 0; inset-inline-start: -100vw;";
  copy.setAttribute("aria-hidden", "true");
  document.body.append(copy);
  const text = copy.innerText;
  copy.remove();

  event.clipboardData.setData("text/plain", text);
  event.clipboardData.setData("text/html", copy.innerHTML);
  event.preventDefault();
}
