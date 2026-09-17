"use client";

import { useState } from "react";
import Icon from "./Icon";

/**
 * A destructive submit that asks first, in place.
 *
 * It expands into its own confirmation rather than opening a dialog: the thing
 * being deleted stays on screen and in context behind the question, which a
 * modal takes away at exactly the moment it matters.
 */
export default function ConfirmButton({
  label,
  confirm,
  className = "btn-danger",
}: {
  label: string;
  /** What the second click will actually do, in plain words. */
  confirm: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className={className}>
        <Icon name="trash" size={15} />
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted">{confirm}</span>
      <button type="submit" className="btn-danger">
        Delete
      </button>
      <button type="button" onClick={() => setArmed(false)} className="btn-ghost">
        Cancel
      </button>
    </span>
  );
}
