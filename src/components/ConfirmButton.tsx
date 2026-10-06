"use client";

import { useState, type ReactNode } from "react";
import Icon from "./Icon";

/**
 * A destructive submit that asks first, in place.
 *
 * It sits at the start of a page's actions as a quiet icon, and when pressed
 * the question takes the place of the whole row: the thing being deleted stays
 * on screen and in context behind it, which a modal takes away at exactly the
 * moment it matters. Delete is neutral, not red — it asks, so it need not
 * shout.
 *
 * Render it inside the form that does the deleting; `children` are the row's
 * other actions, shown beside it until it is armed.
 */
export default function ConfirmButton({
  label,
  confirm,
  children,
}: {
  label: string;
  /** What the second click will actually do, in plain words. */
  confirm: ReactNode;
  children?: ReactNode;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <>
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="btn btn--secondary btn--icon"
          aria-label={label}
          title={label}
        >
          <Icon name="trash" />
        </button>
        {children}
      </>
    );
  }

  return (
    <span className="confirm" onKeyDown={(event) => event.key === "Escape" && setArmed(false)}>
      <span className="confirm__text">{confirm}</span>
      <button type="submit" className="btn btn--dark">
        Delete
      </button>
      <button type="button" onClick={() => setArmed(false)} className="btn btn--plain" autoFocus>
        Cancel
      </button>
    </span>
  );
}
