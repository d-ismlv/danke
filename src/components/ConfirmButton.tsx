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
}: {
  label: string;
  /** What the second click will actually do, in plain words. */
  confirm: string;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className="danger-action">
        <Icon name="trash" />
        {label}
      </button>
    );
  }

  return (
    <span className="confirm-row">
      <span>{confirm}</span>
      <button type="submit" className="danger-action">
        Delete
      </button>
      <button type="button" onClick={() => setArmed(false)} className="ghost-action">
        Cancel
      </button>
    </span>
  );
}
