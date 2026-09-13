/**
 * Session cookies, signed rather than shared.
 *
 * The cookie used to *be* `AUTH_SESSION_TOKEN`: one constant string, identical
 * on every device, valid for as long as the container lived. Logging out
 * cleared the browser's copy and nothing else, so a cookie that leaked stayed
 * good forever and there was no such thing as an old session.
 *
 * Now `AUTH_SESSION_TOKEN` is only the signing key. Each login mints
 * `nonce.issuedAt.signature` — different every time, and refused once it is
 * thirty days old. Rotating the key still invalidates every session at once,
 * which is the blunt instrument for "sign out everywhere".
 *
 * Deliberately free of `server-only` and of any Node built-in: this module is
 * imported by the proxy, which runs on the edge runtime, so it uses Web Crypto
 * — present in both — and nothing else.
 */

const ENCODER = new TextEncoder();

/** Thirty days. Long enough not to be a nuisance, short enough to expire. */
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** A little slack for clock skew between issuing and verifying. */
const FUTURE_SKEW_MS = 60_000;

const keyCache = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
  const cached = keyCache.get(secret);
  if (cached) return cached;
  const key = crypto.subtle.importKey(
    "raw",
    ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  keyCache.set(secret, key);
  return key;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function sign(payload: string, secret: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), ENCODER.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

/** A fresh session token. Never twice the same, even for the same password. */
export async function issueSessionToken(secret: string, now = Date.now()): Promise<string> {
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
  const payload = `${nonce}.${now}`;
  return `${payload}.${await sign(payload, secret)}`;
}

/** Whether a cookie was signed with this secret and is still inside its window. */
export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [nonce, issued, signature] = parts;

  const bytes = fromBase64Url(signature);
  if (!bytes) return false;
  // subtle.verify compares in constant time, which `===` on the old shared
  // token did not.
  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    bytes as unknown as ArrayBuffer,
    ENCODER.encode(`${nonce}.${issued}`),
  );
  if (!valid) return false;

  const issuedAt = Number(issued);
  if (!Number.isFinite(issuedAt)) return false;
  return issuedAt <= now + FUTURE_SKEW_MS && now - issuedAt < SESSION_MAX_AGE_MS;
}

/**
 * Compare two secrets without leaking their length or contents through timing.
 * HMAC both under a key nobody outside this process knows, then compare the
 * digests: equal inputs give equal digests, and the comparison runs over a
 * fixed 32 bytes whatever the inputs were.
 */
export async function secretsMatch(a: string, b: string): Promise<boolean> {
  const key = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const [da, db] = await Promise.all([sign(a, key), sign(b, key)]);
  if (da.length !== db.length) return false;
  let diff = 0;
  for (let i = 0; i < da.length; i++) diff |= da.charCodeAt(i) ^ db.charCodeAt(i);
  return diff === 0;
}
