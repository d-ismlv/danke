"use client";

import { useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { resetTopic } from "@/lib/actions";
import Icon from "./Icon";

/**
 * Starts a topic over: every card back to unseen, after asking in a dialog.
 *
 * A dialog, where Delete topic asks in place. Deleting takes the topic away;
 * a reset leaves every card where it was and quietly throws away what the
 * scheduler knew about them, which is the easier of the two to do without
 * meaning to — so it stops everything until it has an answer. Cancel takes
 * the focus, and Escape or a click outside is a Cancel too.
 */
export default function ResetTopic({ id, name }: { id: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const close = () => dialog.current?.close();
  const open = () => {
    dialog.current?.showModal();
    cancel.current?.focus();
  };

  return (
    <>
      <button type="button" onClick={open} className="ghost-action">
        <Icon name="reset" />
        Reset progress
      </button>

      <dialog
        ref={dialog}
        className="confirm-dialog"
        aria-labelledby={titleId}
        // The dialog's own box is only ever hit from outside the panel it
        // holds, so a click that lands on it landed on the backdrop.
        onClick={(event) => event.target === dialog.current && close()}
      >
        <form
          className="confirm-dialog__panel"
          action={async (data) => {
            await resetTopic(data);
            close();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <h2 id={titleId}>Reset progress on {name}?</h2>
          <p>
            Every card goes back to unseen and starts again from its first review. The answers
            you have already given still count toward your streak and activity.
          </p>
          <div className="confirm-dialog__actions">
            <button type="button" ref={cancel} onClick={close} className="ghost-action">
              Cancel
            </button>
            <Confirm />
          </div>
        </form>
      </dialog>
    </>
  );
}

function Confirm() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="danger-action">
      {pending ? "Resetting…" : "Reset progress"}
    </button>
  );
}
