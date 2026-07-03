"use client";

import { useState } from "react";
import Link from "next/link";
import Markdown from "./Markdown";
import { createCard, updateCard } from "@/lib/actions";

type Props = {
  deckId: string;
  card?: { id: string; front: string; back: string };
};

function Field({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </label>
      <div className="grid gap-2 md:grid-cols-2">
        <textarea
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          placeholder="Markdown…"
          className="resize-y rounded-xl border border-border bg-surface p-3 font-mono text-sm outline-none focus:border-accent"
        />
        <div className="min-h-[9rem] overflow-auto rounded-xl border border-border bg-surface p-3">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <span className="text-sm text-muted">Preview</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CardEditor({ deckId, card }: Props) {
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(card?.back ?? "");
  const isEdit = Boolean(card);

  return (
    <form action={isEdit ? updateCard : createCard} className="flex flex-col gap-5">
      <input type="hidden" name="deckId" value={deckId} />
      {card && <input type="hidden" name="id" value={card.id} />}

      <Field label="Front" name="front" value={front} onChange={setFront} />
      <Field label="Back" name="back" value={back} onChange={setBack} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          {isEdit ? "Save changes" : "Add card"}
        </button>
        {!isEdit && (
          <button
            type="submit"
            name="addAnother"
            value="1"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2"
          >
            Add &amp; new
          </button>
        )}
        <Link
          href={`/decks/${deckId}`}
          className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
