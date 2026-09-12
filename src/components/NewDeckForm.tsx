"use client";

import { useRef, useState } from "react";
import { createDeck } from "@/lib/actions";
import type { Deck } from "@/db/schema";
import Icon from "./Icon";

export default function NewDeckForm({ decks }: { decks: Deck[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="transition-state flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-4 text-sm font-medium text-muted hover:border-accent hover:bg-surface/60 hover:text-foreground"
      >
        <Icon name="plus" size={16} />
        New deck
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
        className="input flex-1"
      />
      <select
        name="parentId"
        defaultValue=""
        className="select sm:max-w-48"
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
          <Icon name="plus" size={15} />
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
