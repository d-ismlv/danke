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
 * SSR and hydration agree: both read the same stamped attribute.
 *
 * Cookies fire no event when they change, so the choice is mirrored into
 * localStorage as well — not as a second source of truth, only as the thing
 * that wakes other tabs. Without it a second tab kept the old theme until its
 * next navigation, which the localStorage version it replaced did not do.
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

const SIGNAL_KEY = "danke-theme";

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SIGNAL_KEY) return;
    apply(asTheme(event.newValue ?? undefined));
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function setTheme(next: Theme) {
  // A year, lax, path-wide: it is a display preference, not a credential.
  const age = next === "system" ? 0 : 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${age}; samesite=lax`;
  // Storage can throw in private modes; the theme still works without it, the
  // other tabs just won't hear about it.
  try {
    localStorage.setItem(SIGNAL_KEY, next);
  } catch {}
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
      className="btn-ghost size-10 px-0 sm:size-9"
    >
      <Icon name={ICON[theme]} size={19} className="sm:size-[17px]" />
    </button>
  );
}
