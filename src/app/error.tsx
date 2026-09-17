"use client";

import { useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * Anything a page throws lands here rather than on Next's default screen, which
 * loses the header, the nav, and any sense that the app is still running.
 * `reset()` re-renders the segment, which is enough for a transient database
 * error.
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
    <div className="anim-rise mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-again/12 text-again">
        <Icon name="alert" size={26} />
      </span>
      <h1 className="h-page">This page didn&apos;t load</h1>
      <p className="text-muted text-pretty">
        Your cards and their schedules are untouched — this is a rendering failure, not a write.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-faint">Reference: {error.digest}</p>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn">
          Your decks
        </Link>
      </div>
    </div>
  );
}
