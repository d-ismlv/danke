"use client";

import { useEffect, useState } from "react";

/**
 * One line of "that happened", bottom right, gone in a few seconds. It exists
 * for the actions that leave no trace on screen — copying the template being
 * the only one so far.
 */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message === null) return;
    const timer = window.setTimeout(() => setMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  return {
    show: (text: string) => setMessage(text),
    node: (
      <div className={`toast${message ? " is-visible" : ""}`} role="status" aria-live="polite">
        {message}
      </div>
    ),
  };
}
