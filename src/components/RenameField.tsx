"use client";

import { useRef, useState } from "react";

/**
 * The page title, which is also the way to rename it.
 *
 * Click the name, type, press Enter or click away. There is no edit mode to
 * enter and leave, and no pencil button sitting beside every heading in the
 * app — a deck is renamed rarely enough that it does not deserve its own
 * control, and often enough that it should not need a settings screen.
 *
 * Both states are `font: inherit`, so the heading does not resize or move when
 * it becomes a field.
 */
export default function RenameField({
  action,
  id,
  name,
}: {
  action: (formData: FormData) => void;
  id: string;
  name: string;
}) {
  const [editing, setEditing] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} title="Rename" className="rename-field">
        {name}
      </button>
    );
  }

  return (
    <form
      ref={form}
      action={(data) => {
        setEditing(false);
        action(data);
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input
        name="name"
        defaultValue={name}
        autoFocus
        required
        maxLength={120}
        onBlur={() => form.current?.requestSubmit()}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
        className="rename-input"
      />
    </form>
  );
}
