"use client";

import { useRef, useState } from "react";
import { createDeck } from "@/lib/actions";
import type { Deck } from "@/db/schema";

export default function NewDeckForm({ decks }: { decks: Deck[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted transition hover:border-accent hover:text-foreground"
      >
        + New deck
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await createDeck(fd);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 sm:flex-row"
    >
      <input
        name="name"
        autoFocus
        required
        placeholder="Deck name"
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <select
        name="parentId"
        defaultValue=""
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      >
        <option value="">No parent</option>
        {decks.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
