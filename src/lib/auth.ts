import "server-only";
import { cookies, headers } from "next/headers";
import { issueSessionToken, verifySessionToken, SESSION_MAX_AGE_MS } from "@/lib/session";

export const AUTH_COOKIE = "danke_auth";

/** Whether the current request carries a valid, unexpired session cookie. */
export async function isAuthed(): Promise<boolean> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  return verifySessionToken(token, process.env.AUTH_SESSION_TOKEN);
}

/** Set a freshly-signed session cookie after a correct password. */
export async function grantSession(): Promise<void> {
  // Secure by default in production (correct behind an HTTPS reverse proxy such
  // as nginx-proxy-manager). Set AUTH_INSECURE_COOKIE=true only if you access
  // the container directly over plain HTTP, otherwise the cookie won't be sent.
  const secure =
    process.env.NODE_ENV === "production" &&
    process.env.AUTH_INSECURE_COOKIE !== "true";
  const token = await issueSessionToken(process.env.AUTH_SESSION_TOKEN ?? "");
  (await cookies()).set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(AUTH_COOKIE);
}

/**
 * Refuse to go on unless this request is signed in.
 *
 * The proxy already turns anonymous traffic away, but it is one `matcher`
 * regex from not doing so, and a mutation should not be one typo from being
 * open to the internet. Every action and API route calls this first.
 */
export async function requireSession(): Promise<void> {
  if (!(await isAuthed())) throw new Error("Not signed in");
}

/**
 * Best-effort client address, for throttling password attempts. Behind a
 * reverse proxy the socket address is the proxy's, so the forwarded headers
 * are what distinguish callers; a single shared bucket is the fallback, which
 * throttles everyone together rather than nobody.
 */
export async function clientAddress(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
