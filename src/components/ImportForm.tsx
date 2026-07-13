"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { importCards } from "@/lib/actions";
import { parseCards, type SeparatorKey } from "@/lib/import";

const SEP_OPTIONS: { key: SeparatorKey; label: string }[] = [
  { key: "tab", label: "Tab" },
  { key: "comma", label: "Comma" },
  { key: "semicolon", label: "Semicolon" },
  { key: "pipe", label: "Pipe |" },
];

const PLACEHOLDER = `manzana\tapple
uva\tgrape
¿Cómo estás?\tHow are you?`;

export default function ImportForm({ deckId }: { deckId: string }) {
  const [text, setText] = useState("");
  const [separator, setSeparator] = useState<SeparatorKey>("tab");

  const parsed = useMemo(() => parseCards(text, separator), [text, separator]);

  return (
    <form action={importCards} className="flex flex-col gap-4">
      <input type="hidden" name="deckId" value={deckId} />
      <input type="hidden" name="separator" value={separator} />

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium uppercase tracking-wide text-muted">
          Paste cards — one per line, front and back separated by the chosen
          delimiter
        </label>
        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder={PLACEHOLDER}
          className="min-h-72 resize-y rounded-[18px] border border-border bg-surface p-4 font-mono text-sm leading-6 outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">Delimiter:</span>
        {SEP_OPTIONS.map((o) => (
          <label key={o.key} className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="sep-choice"
              checked={separator === o.key}
              onChange={() => setSeparator(o.key)}
            />
            {o.label}
          </label>
        ))}
      </div>

      {parsed.length > 0 && (
        <div className="panel p-4">
          <div className="mb-2 text-sm text-muted">
            Preview — {parsed.length} card{parsed.length === 1 ? "" : "s"}
          </div>
          <ul className="flex flex-col gap-1 text-sm">
            {parsed.slice(0, 5).map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="truncate font-medium">{c.front || "—"}</span>
                <span className="text-muted">→</span>
                <span className="truncate text-muted">{c.back || "—"}</span>
              </li>
            ))}
            {parsed.length > 5 && (
              <li className="text-muted">…and {parsed.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={parsed.length === 0}
          className="button-primary"
        >
          Import {parsed.length > 0 ? parsed.length : ""} card
          {parsed.length === 1 ? "" : "s"}
        </button>
        <Link
          href={`/decks/${deckId}`}
          className="button-quiet"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
