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
        className="w-full rounded-[18px] border border-dashed border-border px-4 py-4 text-sm font-medium text-muted transition hover:border-accent hover:bg-surface/50 hover:text-foreground"
      >
        <span className="mr-1 text-accent">＋</span> New deck
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
      className="panel flex flex-col gap-3 p-4 sm:flex-row"
    >
      <input
        name="name"
        autoFocus
        required
        placeholder="Deck name"
        className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
      />
      <select
        name="parentId"
        defaultValue=""
        className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
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
          className="button-primary"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="button-quiet"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
