/**
 * One icon set for the whole app: a 24x24 viewBox, stroke-based, inheriting
 * `currentColor` so every icon matches the text it sits beside in colour and
 * weight. This replaces the emoji that used to render in full colour at their
 * own metrics — and, on a 2x panel, at their own resolution.
 */

import type { ReactElement } from "react";

export type IconName =
  | "decks"
  | "ladder"
  | "stats"
  | "play"
  | "practice"
  | "plus"
  | "import"
  | "pencil"
  | "trash"
  | "reset"
  | "lock"
  | "check"
  | "flame"
  | "target"
  | "clock"
  | "cards"
  | "image"
  | "search"
  | "alert"
  | "info"
  | "arrowLeft"
  | "arrowRight"
  | "chevronDown"
  | "sparkle";

const PATHS: Record<IconName, ReactElement> = {
  // Stacked cards.
  decks: (
    <>
      <rect x="3" y="7.5" width="13.5" height="13" rx="2.4" />
      <path d="M7 4.5h11.6A2.4 2.4 0 0 1 21 6.9v10.6" />
    </>
  ),
  // Seven rungs, climbing.
  ladder: (
    <>
      <path d="M7.5 20.5V3.5M16.5 20.5V3.5" />
      <path d="M7.5 17h9M7.5 12h9M7.5 7h9" />
    </>
  ),
  stats: (
    <>
      <path d="M4 20.5h16" />
      <path d="M6.5 20.5V13M11.5 20.5V7M16.5 20.5v-5.5" />
    </>
  ),
  play: <path d="M8 5.2l11 6.8-11 6.8z" />,
  practice: (
    <>
      <path d="M20.5 11.2a8.5 8.5 0 1 0-.9 5" />
      <path d="M20.5 4.8v6.4h-6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  import: (
    <>
      <path d="M12 3.5v11" />
      <path d="M8 10.5l4 4 4-4" />
      <path d="M4.5 16.5v2.2A1.8 1.8 0 0 0 6.3 20.5h11.4a1.8 1.8 0 0 0 1.8-1.8v-2.2" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0 0-3L17 5a2.1 2.1 0 0 0-3 0L3.5 15.5V20z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 6.5h16" />
      <path d="M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
      <path d="M6.5 6.5l.8 12.1A1.9 1.9 0 0 0 9.2 20.5h5.6a1.9 1.9 0 0 0 1.9-1.9l.8-12.1" />
    </>
  ),
  reset: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 1 2.6 6.1" />
      <path d="M3.5 5.6V12h6.4" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  check: <path d="M5 12.8l4.5 4.4L19 6.8" />,
  flame: (
    <>
      <path d="M12 3.2c3.4 3 5 5.6 5 8.3a5 5 0 0 1-10 0c0-1.3.5-2.6 1.5-3.9.4 1.1 1 1.8 1.8 2.1.2-2.4.8-4.6 1.7-6.5z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.2V12l3.2 2" />
    </>
  ),
  cards: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.4" />
      <path d="M3.5 10h17" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.4" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4.5 17.5l4.7-4.4a1.6 1.6 0 0 1 2.2 0l5.2 5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8L20.5 20.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.2l8.4 15a1.4 1.4 0 0 1-1.2 2.1H4.8a1.4 1.4 0 0 1-1.2-2.1z" />
      <path d="M12 10v4.2" />
      <path d="M12 17.6h.01" strokeWidth="2.2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.2v5" />
      <path d="M12 8h.01" strokeWidth="2.2" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M20 12H4.5" />
      <path d="M10.5 5.8L4.2 12l6.3 6.2" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M4 12h15.5" />
      <path d="M13.5 5.8L19.8 12l-6.3 6.2" />
    </>
  ),
  chevronDown: <path d="M6 9.5l6 6 6-6" />,
  sparkle: (
    <>
      <path d="M12 3.5c.8 4.6 2.6 6.5 7.2 7.3-4.6.8-6.4 2.7-7.2 7.3-.8-4.6-2.6-6.5-7.2-7.3 4.6-.8 6.4-2.7 7.2-7.3z" />
      <path d="M18.5 16.5c.3 1.8 1 2.5 2.8 2.8-1.8.3-2.5 1-2.8 2.8-.3-1.8-1-2.5-2.8-2.8 1.8-.3 2.5-1 2.8-2.8z" />
    </>
  ),
};

export default function Icon({
  name,
  size = 17,
  className,
}: {
  name: IconName;
  /** Square side in px. 17 sits with 13px button text; 20 with body copy. */
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flex: "none" }}
    >
      {PATHS[name]}
    </svg>
  );
}
