/**
 * The whole icon set. A 24x24 viewBox, stroke-based, inheriting `currentColor`
 * so an icon matches the text beside it in colour and weight.
 *
 * It is short on purpose. Icons are used where they replace a word — the theme
 * toggle, the lock, an edit affordance — and nowhere a word would have done the
 * job better.
 */

import type { ReactElement } from "react";

export type IconName =
  | "play"
  | "import"
  | "progress"
  | "lock"
  | "check"
  | "pencil"
  | "trash"
  | "back"
  | "chevron"
  | "alert"
  | "sun"
  | "moon"
  | "auto";

const PATHS: Record<IconName, ReactElement> = {
  play: <path d="M8 5.4 19 12 8 18.6z" fill="currentColor" stroke="none" />,
  import: <path d="M12 3v11m0 0 4-4m-4 4-4-4M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16" />,
  progress: <path d="M4 20V10m6 10V4m6 16v-7m-12 7h16" />,
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </>
  ),
  check: <path d="M5 12.6 9.5 17 19 7" />,
  pencil: <path d="M4 20h4L19.2 8.8a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16.2z" />,
  trash: <path d="M4.5 7h15M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7m3 0v12.2A1.8 1.8 0 0 1 15.7 21H8.3a1.8 1.8 0 0 1-1.8-1.8V7" />,
  back: <path d="M19 12H5m0 0 6-6m-6 6 6 6" />,
  chevron: <path d="m6 9.5 6 6 6-6" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8v4.8m0 3.2v.4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.1M12 19.3v2.1M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M2.6 12h2.1M19.3 12h2.1M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5" />
    </>
  ),
  moon: <path d="M20.3 15A8.6 8.6 0 0 1 9.1 3.7a8.6 8.6 0 1 0 11.2 11.3z" />,
  auto: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" stroke="none" />
    </>
  ),
};

export default function Icon({
  name,
  size = 16,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
