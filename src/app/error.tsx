"use client";

import { useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * Anything a page throws lands here instead of on Next's default error screen,
 * which loses the header, the nav, and any sense that the app is still running.
 * `reset()` re-renders the segment, which is usually enough for a transient
 * database or filesystem error.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="anim-rise mx-auto flex w-full max-w-xl flex-col items-center gap-3 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-again-tint text-again">
        <Icon name="alert" size={26} />
      </div>
      <p className="eyebrow">Something broke</p>
      <h1 className="display-title text-2xl sm:text-3xl">This page didn&apos;t load</h1>
      <p className="max-w-md text-pretty text-muted">
        Your cards and their schedules are untouched — this is a rendering
        failure, not a write. Try again, and if it keeps happening the server
        log has the detail.
      </p>
      {error.digest && (
        <p className="mono text-xs text-faint">Reference: {error.digest}</p>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="button-primary">
          <Icon name="reset" size={15} />
          Try again
        </button>
        <Link href="/" className="button-secondary">
          <Icon name="decks" size={15} />
          Your decks
        </Link>
      </div>
    </div>
  );
}
