"use client";

import { useSyncExternalStore } from "react";
import Icon, { type IconName } from "./Icon";

type Theme = "system" | "light" | "dark";
const KEY = "danke-theme";
const ORDER: Theme[] = ["system", "light", "dark"];
const ICON: Record<Theme, IconName> = { system: "auto", light: "sun", dark: "moon" };
const LABEL: Record<Theme, string> = {
  system: "Theme: system",
  light: "Theme: light",
  dark: "Theme: dark",
};

/**
 * Theme is a client-only persisted value, so it's read through an external
 * store rather than an effect: that keeps SSR and hydration honest (the button
 * renders the neutral "auto" glyph until React swaps in the real snapshot),
 * satisfies the set-state-in-effect lint, and syncs across tabs for free.
 */
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch {}
  return "system";
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
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function setTheme(next: Theme) {
  try {
    if (next === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {}
  apply(next);
  for (const cb of listeners) cb();
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);

  return (
    <button
      type="button"
      onClick={() => setTheme(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length])}
      title={LABEL[theme]}
      aria-label={LABEL[theme]}
      className="button-quiet size-12 justify-center p-0 sm:size-9"
    >
      <Icon name={ICON[theme]} size={19} className="sm:hidden" />
      <Icon name={ICON[theme]} size={17} className="hidden sm:block" />
    </button>
  );
}
