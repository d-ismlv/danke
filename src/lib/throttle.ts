import "server-only";

/**
 * A failed-password counter, in memory.
 *
 * The login form had nothing in front of it: one password, unlimited guesses,
 * as fast as the network allows. danke runs as a single process against a
 * single SQLite file, so a Map is the right size of answer — it costs no
 * schema, and a restart clearing it is not a weakness worth a table.
 */
const ATTEMPTS = new Map<string, { failures: number; blockedUntil: number }>();

/** Free guesses before the delay starts. */
const FREE = 5;
/** Doubling from ten seconds, to a ceiling of fifteen minutes. */
const BASE_MS = 10_000;
const MAX_MS = 15 * 60_000;
/** Forget a caller that has been quiet for an hour. */
const FORGET_MS = 60 * 60_000;

function sweep(now: number) {
  for (const [key, entry] of ATTEMPTS) {
    if (entry.blockedUntil < now - FORGET_MS) ATTEMPTS.delete(key);
  }
}

/** Milliseconds the caller must wait, or 0 if it may try now. */
export function retryAfter(key: string, now = Date.now()): number {
  const entry = ATTEMPTS.get(key);
  if (!entry) return 0;
  return Math.max(0, entry.blockedUntil - now);
}

export function recordFailure(key: string, now = Date.now()): void {
  sweep(now);
  const entry = ATTEMPTS.get(key) ?? { failures: 0, blockedUntil: 0 };
  entry.failures += 1;
  if (entry.failures > FREE) {
    const delay = Math.min(MAX_MS, BASE_MS * 2 ** (entry.failures - FREE - 1));
    entry.blockedUntil = now + delay;
  }
  ATTEMPTS.set(key, entry);
}

export function recordSuccess(key: string): void {
  ATTEMPTS.delete(key);
}
