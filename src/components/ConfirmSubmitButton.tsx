"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";

/**
 * A submit button that asks first.
 *
 * It used to call `window.confirm`, which works but arrives as a browser
 * chrome dialog in a system font, ignores the app's theme entirely, and on
 * some browsers offers to suppress every later one. This is a native
 * `<dialog>` — so focus trapping, Escape, and inertness behind the modal are
 * the platform's job, not ours — wearing the app's own clothes.
 */
export default function ConfirmSubmitButton({
  children,
  message,
  className,
  confirmLabel = "Confirm",
  tone = "danger",
}: {
  children: ReactNode;
  message: string;
  className?: string;
  confirmLabel?: string;
  tone?: "danger" | "accent";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  /* The `close` event has to be subscribed to directly. It does not bubble, so
     React's event delegation never sees it and a JSX `onClose` does not fire —
     which meant Escape closed the dialog natively while this component went on
     believing it was open. `setOpen(true)` was then a no-op, and the button
     never worked again for the rest of the page's life. */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  return (
    <>
      {/* `type="button"`, deliberately.
          As a submit button this is a live trigger for the form's server
          action from the moment the HTML arrives — which is before React has
          hydrated and attached the handler that opens the dialog. A click in
          that window submitted the form outright: the card was deleted with no
          confirmation shown at all. (The `window.confirm` version this
          replaces had the same hole.) A button that does nothing until it is
          interactive is the right failure mode for a destructive action; the
          dialog needs JavaScript regardless. */}
      <button
        ref={buttonRef}
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>

      <dialog
        ref={dialogRef}
        className="confirm-dialog"
        /* Clicking the backdrop is a click on the dialog element itself; a
           click on anything inside it is not. */
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-md ${
              tone === "danger" ? "bg-again-tint text-again" : "bg-accent-tint text-accent"
            }`}
          >
            <Icon name={tone === "danger" ? "alert" : "info"} size={18} />
          </span>
          <p className="text-pretty pt-1.5 text-sm leading-6">{message}</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="button-secondary" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            className={tone === "danger" ? "button-danger-solid" : "button-primary"}
            onClick={() => {
              setOpen(false);
              // Submit the form the trigger belongs to, naming the trigger so
              // any formAction on it still applies.
              buttonRef.current?.form?.requestSubmit();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
