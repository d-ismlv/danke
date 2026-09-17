"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Anything a page throws lands here rather than on Next's default screen,
 * which loses the rail, the top bar, and any sense that the app is still
 * running. `reset()` re-renders the segment, which is enough for a transient
 * database error.
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
    <div className="centered-message">
      <h1>This page didn&apos;t load</h1>
      <p>
        Your cards and their schedules are untouched — this is a rendering failure, not a write.
      </p>
      {error.digest && <p className="digest">Reference: {error.digest}</p>}
      <div className="centered-message__actions">
        <button type="button" onClick={reset} className="primary-action">
          Try again
        </button>
        <Link href="/" className="ghost-action">
          Library
        </Link>
      </div>
    </div>
  );
}
