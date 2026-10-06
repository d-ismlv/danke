"use client";

import { useState, type ReactNode } from "react";
import Icon from "./Icon";

/**
 * The last of a list's tools — Delete — and the question it asks first.
 *
 * It lives in the list's header with the other tools that change the list,
 * set apart from them by a rule, and never beside a Study button: the action
 * you take every day and the one you cannot take back do not share an edge.
 *
 * Pressed, the question takes the place of the whole tool row, in place: the
 * thing being deleted stays on screen and in context behind it, which a modal
 * takes away at exactly the moment it matters. Delete is neutral, not red — it
 * asks, so it need not shout.
 *
 * `children` are the row's other tools, shown before it until it is armed. The
 * confirming form is rendered only once armed, so a tool among the children
 * may hold a form of its own without nesting one inside another.
 */
export default function ConfirmDelete({
  label,
  confirm,
  action,
  fields,
  children,
}: {
  label: string;
  /** What the second click will actually do, in plain words. */
  confirm: ReactNode;
  action: (formData: FormData) => void | Promise<void>;
  /** Hidden fields the action reads. */
  fields: Record<string, string>;
  children?: ReactNode;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <>
        {children}
        {children && <i className="section-tools__rule" aria-hidden="true" />}
        <button type="button" onClick={() => setArmed(true)} className="btn btn--ghost">
          <Icon name="trash" />
          {label}
        </button>
      </>
    );
  }

  return (
    <form
      action={action}
      className="confirm confirm--small"
      onKeyDown={(event) => event.key === "Escape" && setArmed(false)}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <span className="confirm__text">{confirm}</span>
      <button type="submit" className="btn btn--dark">
        Delete
      </button>
      <button type="button" onClick={() => setArmed(false)} className="btn btn--plain" autoFocus>
        Cancel
      </button>
    </form>
  );
}
