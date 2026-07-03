import "server-only";
import { cookies } from "next/headers";

export const AUTH_COOKIE = "danke_auth";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Whether the current request carries a valid session cookie. */
export async function isAuthed(): Promise<boolean> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  return Boolean(token) && token === process.env.AUTH_SESSION_TOKEN;
}

/** Set the session cookie after a correct password. */
export async function grantSession(): Promise<void> {
  // Secure by default in production (correct behind an HTTPS reverse proxy such
  // as nginx-proxy-manager). Set AUTH_INSECURE_COOKIE=true only if you access
  // the container directly over plain HTTP, otherwise the cookie won't be sent.
  const secure =
    process.env.NODE_ENV === "production" &&
    process.env.AUTH_INSECURE_COOKIE !== "true";
  (await cookies()).set(AUTH_COOKIE, process.env.AUTH_SESSION_TOKEN ?? "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(AUTH_COOKIE);
}
