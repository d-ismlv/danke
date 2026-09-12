"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { importLadders, type LadderImportState } from "@/lib/actions";
import { parseLadders, RUNG_NAMES } from "@/lib/import";
import type { Deck } from "@/db/schema";
import Icon from "./Icon";

const PLACEHOLDER = `---
concept: kerberos.roasting
deck: AD / Kerberos
---

## 1 :: What is Kerberoasting?
Offline password attack against **service accounts**, using service tickets
any authenticated user can request.

## 2 :: Why does it work?
- Any authenticated principal can request a ticket for **any SPN**
- Part of the ticket is encrypted with the **service account's long-term key**
- That key is derived from the account **password**`;

export default function LadderImportForm({
  decks,
  defaultDeckId,
}: {
  decks: Deck[];
  defaultDeckId?: string;
}) {
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<LadderImportState, FormData>(
    importLadders,
    { error: null },
  );

  const parsed = useMemo(() => parseLadders(text), [text]);
  const cardCount = parsed.ladders.reduce((n, l) => n + l.cards.length, 0);
  const blocked = parsed.errors.length > 0 || parsed.ladders.length === 0;

  /** Concept files are authored in a repo; this is the shortest path from
   * there to here that doesn't need a shell on the server. */
  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const contents = await Promise.all([...files].map((f) => f.text()));
    setText((current) =>
      [current.trim(), ...contents.map((c) => c.trim())].filter(Boolean).join("\n\n"),
    );
    setLoaded((names) => [...names, ...[...files].map((f) => f.name)]);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="text" value={text} />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="ladder-text" className="label">
            Concept files
          </label>
          <div className="flex items-center gap-2">
            {loaded.length > 0 && (
              <span className="chip">
                <Icon name="check" size={12} />
                {loaded.length} file{loaded.length === 1 ? "" : "s"} loaded
              </span>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="button-secondary min-h-8 px-2.5 py-1 text-xs"
            >
              <Icon name="import" size={14} />
              Choose .md files
            </button>
            {text && (
              <button
                type="button"
                onClick={() => {
                  setText("");
                  setLoaded([]);
                }}
                className="button-quiet min-h-8 px-2.5 py-1 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          multiple
          hidden
          onChange={(e) => void addFiles(e.target.files)}
        />
        <textarea
          id="ladder-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          spellCheck={false}
          placeholder={PLACEHOLDER}
          className="textarea mono min-h-80"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="ladder-deck" className="text-muted">
          Deck for concepts with no <code className="mono">deck:</code> line
        </label>
        <select
          id="ladder-deck"
          name="deckId"
          defaultValue={defaultDeckId ?? ""}
          className="select max-w-64"
        >
          <option value="">None — front-matter decides</option>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {parsed.errors.length > 0 && (
        <ul className="anim-settle flex flex-col gap-1 rounded-xl border border-again/30 bg-again-tint px-4 py-3 text-sm text-again">
          {parsed.errors.slice(0, 6).map((e, i) => (
            <li key={i} className="flex gap-2">
              <Icon name="alert" size={15} />
              {e}
            </li>
          ))}
        </ul>
      )}

      {parsed.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl border border-hard/30 bg-hard-tint px-4 py-3 text-sm text-hard">
          {parsed.warnings.slice(0, 6).map((w, i) => (
            <li key={i} className="flex gap-2">
              <Icon name="info" size={15} />
              {w}
            </li>
          ))}
        </ul>
      )}

      {state.error && (
        <p className="anim-settle flex items-center gap-2 rounded-xl border border-again/30 bg-again-tint px-4 py-3 text-sm text-again">
          <Icon name="alert" size={15} />
          {state.error}
        </p>
      )}

      {parsed.ladders.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-surface-2/60 px-4 py-2.5 text-sm">
            <span className="font-semibold">
              {parsed.ladders.length} concept{parsed.ladders.length === 1 ? "" : "s"} ·{" "}
              {cardCount} card{cardCount === 1 ? "" : "s"}
            </span>
            <span className="text-xs text-muted">
              Existing cards are updated; their schedules stay
            </span>
          </div>
          <ul className="divide-y divide-border">
            {parsed.ladders.map((ladder) => (
              <li key={ladder.conceptId} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{ladder.conceptId}</span>
                  <span className="chip">
                    <Icon name="decks" size={12} />
                    {ladder.deckPath.join(" / ") || "current deck"}
                  </span>
                </div>
                <ol className="mt-2 flex flex-col gap-1">
                  {ladder.cards.map((card) => (
                    <li key={card.rung} className="flex items-baseline gap-2 text-sm">
                      <span className="rung-cell size-6 min-w-6 shrink-0 text-[0.65rem]">
                        {card.rung}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        <span className="text-muted">{RUNG_NAMES[card.rung]} — </span>
                        {card.front}
                      </span>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={blocked || pending} className="button-primary">
          <Icon name="import" size={15} />
          {pending
            ? "Importing…"
            : `Import ${cardCount > 0 ? cardCount : ""} card${cardCount === 1 ? "" : "s"}`}
        </button>
        <Link href="/edge" className="button-quiet">
          Cancel
        </Link>
      </div>
    </form>
  );
}
