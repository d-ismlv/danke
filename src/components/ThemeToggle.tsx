"use client";

import { useSyncExternalStore } from "react";
import Icon, { type IconName } from "./Icon";
import { asTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

const ORDER: Theme[] = ["system", "light", "dark"];
const ICON: Record<Theme, IconName> = { system: "auto", light: "sun", dark: "moon" };
const LABEL: Record<Theme, string> = {
  system: "Theme: system",
  light: "Theme: light",
  dark: "Theme: dark",
};

/**
 * The choice lives in a cookie so the *server* can stamp `data-theme` on
 * <html> while it renders. That is what removes the flash: the old version
 * shipped an inline <script> to do it before first paint, which React 19
 * refuses to execute and warns about, and which could only ever run after the
 * document had already started arriving.
 *
 * The value is still read through an external store rather than an effect, so
 * SSR and hydration agree: both read the same stamped attribute. A second tab
 * picks the change up on its next navigation, which is when the server reads
 * the cookie again — cookies fire no storage event of their own.
 */
const listeners = new Set<() => void>();

/** The rendered truth: whatever the server (or the last click) put on <html>. */
function read(): Theme {
  return asTheme(document.documentElement.getAttribute("data-theme") ?? undefined);
}

/** Stamp the choice on <html>: an explicit theme wins over the OS preference;
 * "system" clears the attribute and follows prefers-color-scheme. */
function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function setTheme(next: Theme) {
  // A year, lax, path-wide: it is a display preference, not a credential.
  const age = next === "system" ? 0 : 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${age}; samesite=lax`;
  apply(next);
  for (const cb of listeners) cb();
}

export default function ThemeToggle({ initial }: { initial: Theme }) {
  const theme = useSyncExternalStore(subscribe, read, () => initial);
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={LABEL[theme]}
      aria-label={LABEL[theme]}
      className="button-quiet size-12 justify-center p-0 sm:size-9"
    >
      <Icon name={ICON[theme]} size={19} className="sm:size-[17px]" />
    </button>
  );
}
