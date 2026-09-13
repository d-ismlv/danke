/**
 * Shared by the server (which stamps the choice on <html> while rendering)
 * and by the toggle (which writes it). It lives here rather than in the
 * toggle because every export of a "use client" module reaches a server
 * component as a client *reference*, not as its value — importing the cookie
 * name from there handed the server an opaque stub and it silently read
 * nothing, which is exactly the flash the cookie was meant to remove.
 */
export type Theme = "system" | "light" | "dark";

export const THEME_COOKIE = "danke_theme";

/** Narrow an untrusted cookie value. "system" is the absence of a choice. */
export function asTheme(value: string | undefined): Theme {
  return value === "light" || value === "dark" ? value : "system";
}
