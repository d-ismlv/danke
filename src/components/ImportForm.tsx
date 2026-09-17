"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { importCards, topicTitles, type ImportState } from "@/lib/actions";
import { parseCards, TEMPLATE, MIN_POINTS, MAX_POINTS } from "@/lib/parse";
import Inline from "./Inline";
import Icon from "./Icon";

type DeckOption = { id: string; name: string; topics: { id: string; name: string }[] };

const NEW = "__new__";

/** Stable empty set, so it never looks like a change to a dependency. */
const NO_TITLES: ReadonlySet<string> = new Set<string>();

export default function ImportForm({
  decks,
  initialDeck,
  initialTopic,
}: {
  decks: DeckOption[];
  initialDeck?: string;
  initialTopic?: string;
}) {
  const [deckId, setDeckId] = useState(
    initialDeck && decks.some((d) => d.id === initialDeck) ? initialDeck : decks[0]?.id ?? NEW,
  );
  const [topicId, setTopicId] = useState(initialTopic ?? NEW);
  const [text, setText] = useState("");
  /* Controlled for the same reason the card editor's fields are: a form action
     that comes back with an error takes the uncontrolled fields with it. */
  const [newDeck, setNewDeck] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [showFormat, setShowFormat] = useState(false);

  const [state, action, pending] = useActionState<ImportState, FormData>(importCards, {
    error: null,
  });

  const deck = decks.find((d) => d.id === deckId);
  const topics = deck?.topics ?? [];

  /* The same parser the server will run, so the preview is the decision and
     not a guess at it. Nothing can import that this did not already accept. */
  const parsed = useMemo(() => parseCards(text), [text]);

  /* What the chosen topic already asks, so the preview can say which cards are
     an update and which are new. Fetched when the choice changes rather than
     shipped with the page: a library's every card title is not a payload the
     import screen should carry.
     
     The answer is stored with the topic it came from, and read back only for
     that topic. Clearing it on a change would mean a setState in the effect
     body — and keeping it without the check would label the next topic's paste
     against the last one's questions while the fetch was still in flight. */
  const [fetched, setFetched] = useState<{ topicId: string; titles: ReadonlySet<string> }>({
    topicId: "",
    titles: NO_TITLES,
  });
  useEffect(() => {
    if (deckId === NEW || topicId === NEW) return;
    let live = true;
    void topicTitles(topicId)
      .then((titles) => {
        if (live) setFetched({ topicId, titles: new Set(titles) });
      })
      .catch(() => {
        // Nothing to show: the preview falls back to calling every card new,
        // and the import itself still does the right thing on the server.
      });
    return () => {
      live = false;
    };
  }, [deckId, topicId]);

  const known = fetched.topicId === topicId ? fetched.titles : NO_TITLES;

  const ready = text.trim().length > 0 && parsed.issues.length === 0;

  return (
    <form action={action} className="flex flex-col gap-6">
      <section className="panel flex flex-col gap-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="deck" className="field-label">
              Deck
            </label>
            <select
              id="deck"
              value={deckId}
              onChange={(e) => {
                setDeckId(e.target.value);
                setTopicId(NEW);
              }}
              className="select"
            >
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
              <option value={NEW}>+ New deck…</option>
            </select>
            {deckId === NEW && (
              <input
                name="newDeck"
                value={newDeck}
                onChange={(e) => setNewDeck(e.target.value)}
                placeholder="Deck name"
                required
                maxLength={120}
                className="input mt-2"
              />
            )}
          </div>

          <div>
            <label htmlFor="topic" className="field-label">
              Topic
            </label>
            <select
              id="topic"
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="select"
              disabled={deckId === NEW}
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              <option value={NEW}>+ New topic…</option>
            </select>
            {(topicId === NEW || deckId === NEW) && (
              <input
                name="newTopic"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Topic name"
                required
                maxLength={120}
                className="input mt-2"
              />
            )}
          </div>
        </div>
        {/* The pickers are local state; these carry what the server should act
            on. A select named `deckId` would submit the "+ New deck…" sentinel
            as though it were an id, and a disabled one submits nothing at all. */}
        <input type="hidden" name="deckId" value={deckId === NEW ? "" : deckId} />
        <input
          type="hidden"
          name="topicId"
          value={deckId === NEW || topicId === NEW ? "" : topicId}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <label htmlFor="text" className="h-section">
            Cards
          </label>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => setShowFormat((v) => !v)}
              className="text-muted transition-colors hover:text-accent"
              aria-expanded={showFormat}
            >
              {showFormat ? "Hide format" : "Show format"}
            </button>
            <button
              type="button"
              onClick={() => setText(TEMPLATE)}
              className="text-muted transition-colors hover:text-accent"
            >
              Use example
            </button>
          </div>
        </div>

        {showFormat && (
          <div className="panel anim-fade flex flex-col gap-3 p-5">
            <p className="text-sm text-muted text-pretty">
              A card is a question line starting with <code className="code">#</code>, followed by{" "}
              {MIN_POINTS}–{MAX_POINTS} points starting with <code className="code">-</code>. Repeat
              for every card. Blank lines are ignored, and a point may wrap onto an indented line.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-surface-2 p-4 font-mono text-xs leading-relaxed">
              {TEMPLATE.trimEnd()}
            </pre>
            <p className="text-sm text-muted">
              Inside a question or a point: <code className="code">**bold**</code>,{" "}
              <code className="code">*italic*</code>, <code className="code">`code`</code>, and{" "}
              <code className="code">**`bold code`**</code>.
            </p>
          </div>
        )}

        <textarea
          id="text"
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          placeholder={"# Your question?\n\n- First point\n- Second point"}
          className="textarea min-h-72"
        />
      </section>

      <Preview
        text={text}
        parsed={parsed}
        known={known}
        serverError={state.error}
        serverIssues={state.issues}
      />

      <div className="flex items-center gap-3">
        <button type="submit" disabled={!ready || pending} className="btn-primary btn-lg">
          <Icon name="import" size={16} />
          {pending
            ? "Importing…"
            : ready
              ? `Import ${parsed.cards.length} card${parsed.cards.length === 1 ? "" : "s"}`
              : "Import"}
        </button>
        {!ready && text.trim().length > 0 && (
          <span className="text-sm text-muted">Fix the problems above first.</span>
        )}
      </div>
    </form>
  );
}

function Preview({
  text,
  parsed,
  known,
  serverError,
  serverIssues,
}: {
  text: string;
  parsed: ReturnType<typeof parseCards>;
  known: ReadonlySet<string>;
  serverError: string | null;
  serverIssues?: { line: number | null; message: string }[];
}) {
  const issues = serverIssues?.length ? serverIssues : parsed.issues;

  if (!text.trim()) {
    return (
      <div className="panel px-6 py-10 text-center text-sm text-muted">
        Paste your cards above to see exactly what will be imported.
      </div>
    );
  }

  if (issues.length > 0) {
    return (
      <div className="panel overflow-hidden border-again/40">
        <p className="flex items-center gap-2 border-b border-again/25 bg-again/8 px-5 py-3 text-sm font-semibold text-again">
          <Icon name="alert" size={16} />
          {serverError ??
            `${issues.length} problem${issues.length === 1 ? "" : "s"} — nothing will be imported`}
        </p>
        <ul className="divide-hairline">
          {issues.slice(0, 12).map((issue, i) => (
            <li key={i} className="flex gap-3 px-5 py-2.5 text-sm">
              <span className="num w-12 shrink-0 text-xs text-faint">
                {issue.line === null ? "—" : `L${issue.line}`}
              </span>
              <span className="text-pretty">{issue.message}</span>
            </li>
          ))}
          {issues.length > 12 && (
            <li className="px-5 py-2.5 text-sm text-muted">
              …and {issues.length - 12} more.
            </li>
          )}
        </ul>
      </div>
    );
  }

  const updates = parsed.cards.filter((c) => known.has(c.title)).length;
  const adds = parsed.cards.length - updates;

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b px-5 py-3">
        <p className="text-sm font-semibold">
          {parsed.cards.length} card{parsed.cards.length === 1 ? "" : "s"} ready
        </p>
        <p className="num text-sm text-muted">
          {adds} new
          {updates > 0 && (
            <> · {updates} updated, keeping their progress</>
          )}
        </p>
      </div>
      <ul className="divide-hairline max-h-96 overflow-y-auto">
        {parsed.cards.map((card, i) => (
          <li key={i} className="flex items-baseline gap-3 px-5 py-3">
            <span className="num w-6 shrink-0 text-xs text-faint">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-pretty">
                <Inline>{card.title}</Inline>
              </p>
              <p className="num mt-0.5 text-xs text-faint">{card.points.length} points</p>
            </div>
            <span className="shrink-0 text-xs text-faint">
              {known.has(card.title) ? "update" : "new"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
