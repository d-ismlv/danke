/**
 * The whole icon set, on the mockup's 24x24 grid and drawn in the mockup's
 * weight. Everything inherits `currentColor`, so an icon matches the text
 * beside it without being told to.
 *
 * It is short on purpose: an icon is here where it replaces a word, or where
 * it labels a rail item that is already labelled.
 */

import type { ReactElement } from "react";

export type IconName =
  | "library"
  | "deck"
  | "card"
  | "chart"
  | "import"
  | "play"
  | "chevron"
  | "arrow"
  | "flame"
  | "lock"
  | "check"
  | "alert"
  | "pencil"
  | "trash"
  | "theme-system"
  | "theme-light"
  | "theme-dark";

const PATHS: Record<IconName, ReactElement> = {
  library: <path d="M5 4.5h14v15H5zM8.5 8h7M8.5 12h7M8.5 16h4" />,
  deck: <path d="m4 8 8-4 8 4-8 4-8-4Zm0 4 8 4 8-4M4 16l8 4 8-4" />,
  card: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M7.5 9h9M7.5 13h6" />
    </>
  ),
  chart: <path d="M4 19.5V13M10 19.5v-11M16 19.5V5M22 19.5H2" />,
  import: <path d="M12 3v11M7.5 10 12 14.5 16.5 10M4 18v2.5h16V18" />,
  play: <path d="m9 7 8 5-8 5V7Z" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  arrow: <path d="M5 12h13M14 7l5 5-5 5" />,
  flame: (
    <path d="M12.5 3.5c1 4-3.5 4.8-2.2 8.1.7 1.9 2.8 1.4 3.2-.1.5 1.1 1.8 2.4 1.8 4.5a4.8 4.8 0 0 1-9.6 0c0-4.3 3.2-7.7 6.8-12.5Z" />
  ),
  lock: (
    <>
      <rect x="4.75" y="10.25" width="14.5" height="9.5" rx="2.2" />
      <path d="M8.25 10.25V7.6a3.75 3.75 0 0 1 7.5 0v2.65M12 13.9v2.2" />
    </>
  ),
  check: <path d="M5 12.6 9.5 17 19 7" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8v4.8m0 3.2v.4" />
    </>
  ),
  pencil: <path d="M4 20h4L19.2 8.8a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16.2z" />,
  trash: <path d="M4.5 7h15M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7m3 0v12.2A1.8 1.8 0 0 1 15.7 21H8.3a1.8 1.8 0 0 1-1.8-1.8V7" />,
  // A display, for "whatever this machine is set to".
  "theme-system": (
    <>
      <rect x="3.25" y="4.5" width="17.5" height="11.5" rx="1.8" />
      <path d="M8.75 20h6.5M12 16v4" />
    </>
  ),
  "theme-light": (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </>
  ),
  "theme-dark": <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />,
};

export default function Icon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
