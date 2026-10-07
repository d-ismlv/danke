"use client";

import { useActionState, useMemo, useState } from "react";
import { importCards, type ImportState } from "@/lib/actions";
import { parseCards, TEMPLATE } from "@/lib/parse";
import { useIndent } from "@/lib/indent";
import Inline from "./Inline";
import Points from "./Points";
import Icon from "./Icon";
import { useToast } from "./Toast";

type DeckOption = { id: string; name: string; topics: { id: string; name: string }[] };

/** The editor never draws shorter than this, so an empty paste has room. */
const MIN_ROWS = 18;

/**
 * The import screen: where the cards go, the Markdown they are written in,
 * and a preview of exactly what will be written — all before anything is.
 */
export default function ImportForm({
  decks,
  initialDeck,
  initialTopic,
}: {
  decks: DeckOption[];
  initialDeck?: string;
  initialTopic?: string;
}) {
  const startDeck =
    initialDeck && decks.some((d) => d.id === initialDeck) ? initialDeck : decks[0]?.id;
  const startTopics = decks.find((d) => d.id === startDeck)?.topics ?? [];
  const startTopic =
    initialTopic && startTopics.some((t) => t.id === initialTopic)
      ? initialTopic
      : startTopics[0]?.id;

  const [deckId, setDeckId] = useState(startDeck ?? "");
  const [newDeck, setNewDeck] = useState("");
  const [creatingDeck, setCreatingDeck] = useState(decks.length === 0);
  const [topicId, setTopicId] = useState(startTopic ?? "");
  const [newTopic, setNewTopic] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(startTopics.length === 0);
  const [text, setText] = useState("");
  const toast = useToast();
  const onKeyDown = useIndent();

  const [state, action, pending] = useActionState<ImportState, FormData>(importCards, {
    error: null,
  });

  const topics = decks.find((d) => d.id === deckId)?.topics ?? [];

  /* Changing the deck changes which topics exist, so the topic choice follows
     it here rather than in an effect that watches for it afterwards — there is
     no moment where the form is pointing at a topic in a deck it has left. */
  function chooseDeck(id: string) {
    const next = decks.find((d) => d.id === id)?.topics ?? [];
    setDeckId(id);
    setTopicId(next[0]?.id ?? "");
    setCreatingTopic(next.length === 0);
  }

  /** A new deck has no topics, so naming one is always naming a new topic. */
  function toggleNewDeck() {
    const creating = decks.length === 0 || !creatingDeck;
    setCreatingDeck(creating);
    setCreatingTopic(creating || topics.length === 0);
  }

  /* The same parser the server will run, so the preview is the decision and
     not a guess at it. Nothing can import that this did not already accept. */
  const parsed = useMemo(() => parseCards(text), [text]);
  const issues = state.issues?.length ? state.issues : parsed.issues;

  /* Which source lines the parser objected to, so the editor can point at them
     instead of leaving you to count down to "line 14". */
  const badLines = useMemo(() => {
    const lines = new Set<number>();
    for (const issue of issues) if (issue.line !== null) lines.add(issue.line);
    return lines;
  }, [issues]);
  const lines = text.split("\n");
  /* The editor grows with its text rather than scrolling inside itself, so
     the line numbers and highlights beside it never have to follow a scroll.
     It does not wrap, so a line is always one row of each. */
  const rows = Math.max(MIN_ROWS, lines.length + 1);

  const empty = text.trim().length === 0;
  const destinationReady = creatingDeck ? newDeck.trim() !== "" : deckId !== "";
  const topicReady = creatingTopic ? newTopic.trim() !== "" : topicId !== "";
  const contentReady = !empty && parsed.issues.length === 0;
  const ready = destinationReady && topicReady && contentReady;
  const count = parsed.cards.length;

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(TEMPLATE);
      toast.show("The Markdown template has been copied.");
    } catch {
      toast.show("Your browser would not let the app copy. Select and copy instead.");
    }
  };

  return (
    <form action={action}>
      <section className="panel" aria-labelledby="import-title">
        <div className="head">
          <div className="head__main">
            {/* An empty eyebrow keeps the title on the same line as every
                other page's. */}
            <p className="eyebrow" aria-hidden="true" />
            <h1 className="title" id="import-title">
              Import
            </h1>
          </div>
          <div className="head__side">
            <button type="button" className="btn btn--secondary" onClick={copyTemplate}>
              <Icon name="copy" />
              Copy template
            </button>
          </div>
        </div>

        <div className="destination" role="group" aria-label="Destination">
          <div className="field">
            <label className="field__label" htmlFor={creatingDeck ? "import-new-deck" : "import-deck"}>
              {creatingDeck ? "New deck" : "Deck"}
            </label>
            <div className="picker">
              {creatingDeck ? (
                <input
                  id="import-new-deck"
                  className="input"
                  type="text"
                  name="newDeck"
                  value={newDeck}
                  maxLength={120}
                  placeholder="e.g. Endpoint Security"
                  autoFocus={decks.length > 0}
                  onChange={(event) => setNewDeck(event.target.value)}
                />
              ) : (
                <span className="select-wrap">
                  <select
                    id="import-deck"
                    className="select"
                    value={deckId}
                    onChange={(event) => chooseDeck(event.target.value)}
                  >
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevron" />
                </span>
              )}
              {decks.length > 0 && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  aria-expanded={creatingDeck}
                  onClick={toggleNewDeck}
                >
                  {creatingDeck ? "Use existing" : "New deck"}
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor={creatingTopic ? "import-new-topic" : "import-topic"}>
              {creatingTopic ? "New topic" : "Topic"}
            </label>
            <div className="picker">
              {creatingTopic ? (
                <input
                  id="import-new-topic"
                  className="input"
                  type="text"
                  name="newTopic"
                  value={newTopic}
                  maxLength={120}
                  placeholder="e.g. Resource-based delegation"
                  onChange={(event) => setNewTopic(event.target.value)}
                />
              ) : (
                <span className="select-wrap">
                  <select
                    id="import-topic"
                    className="select"
                    value={topicId}
                    onChange={(event) => setTopicId(event.target.value)}
                  >
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevron" />
                </span>
              )}
              {!creatingDeck && topics.length > 0 && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  aria-expanded={creatingTopic}
                  onClick={() => setCreatingTopic((v) => !v)}
                >
                  {creatingTopic ? "Use existing" : "New topic"}
                </button>
              )}
            </div>
          </div>
        </div>
        {/* The pickers are local state; these carry what the server should act
            on. A disabled or absent select submits nothing at all. */}
        <input type="hidden" name="deckId" value={creatingDeck ? "" : deckId} />
        <input type="hidden" name="topicId" value={creatingDeck || creatingTopic ? "" : topicId} />
      </section>

      <section className="workspace" aria-label="Markdown import">
        <div className="workpanel">
          <div className="workpanel__head">
            <h2>Markdown</h2>
            <span className="meta num">
              {lines.length} line{lines.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="md">
            <div className="md__gutter" aria-hidden="true">
              {lines.map((_, i) => (
                <span key={i} className={badLines.has(i + 1) ? "is-bad" : undefined}>
                  {i + 1}
                </span>
              ))}
            </div>
            <div className="md__field">
              <div className="md__lines" aria-hidden="true">
                {lines.map((_, i) => (
                  <span key={i} className={badLines.has(i + 1) ? "is-bad" : undefined} />
                ))}
              </div>
              <textarea
                className="md__input"
                name="text"
                aria-label="Markdown cards"
                spellCheck={false}
                wrap="off"
                rows={rows}
                value={text}
                placeholder={"# Your question?\n\n- First answer point\n- Second answer point"}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={onKeyDown}
              />
            </div>
          </div>
          <div className="workpanel__foot">
            <span>
              <code>#</code> a question, then its points — <code>-</code> to bullet, <code>1.</code>{" "}
              to number, Tab to nest one level
            </span>
            <span>
              <strong>**bold**</strong> · <em>*italic*</em> · <code>`code`</code> ·{" "}
              <code>[text](https://…)</code>
            </span>
          </div>
        </div>

        <div className="workpanel">
          <div className="workpanel__head">
            <h2>Preview</h2>
            {!empty && issues.length === 0 && (
              <span className="meta num">
                {count} card{count === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="workpanel__body preview">
            {empty ? (
              <p className="preview__hint">
                Paste your cards into the Markdown box to see exactly what will be imported.
              </p>
            ) : issues.length > 0 ? (
              <Problems issues={issues} error={state.error} />
            ) : (
              parsed.cards.map((card, i) => (
                <article className="preview-card" key={i}>
                  <p className="preview-card__meta">
                    <span className="preview-card__number">
                      {i + 1} / {count}
                    </span>
                    {card.points.ordered ? "Numbered" : "Bulleted"} · {card.points.items.length}{" "}
                    point{card.points.items.length === 1 ? "" : "s"}
                  </p>
                  <h3>
                    <Inline>{card.title}</Inline>
                  </h3>
                  <Points list={card.points} />
                </article>
              ))
            )}
          </div>
          <div className="workpanel__foot">
            {/* A refusal with no line to point at — the write failed, or the
                deck went away in another tab — has nowhere in the problem list
                to appear, because the list only exists when the paste itself
                is wrong. It takes the status's place instead; left out, the
                button simply came back and nothing said the import had not
                happened. */}
            {state.error && issues.length === 0 && !pending ? (
              <p className="form-error" role="alert">
                <Icon name="alert" />
                {state.error}
              </p>
            ) : (
              <span
                role="status"
                className={`import-status ${empty ? "is-idle" : issues.length > 0 ? "is-bad" : "is-ready"}`}
              >
                <i className="dot" />
                {empty
                  ? "Nothing to import yet"
                  : issues.length > 0
                    ? `${issues.length} problem${issues.length === 1 ? "" : "s"} · nothing will be imported`
                    : "Valid"}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="import-cta">
        <button type="submit" className="btn btn--primary" disabled={!ready || pending}>
          <Icon name="import" />
          {pending ? "Importing…" : contentReady ? `Import ${count} card${count === 1 ? "" : "s"}` : "Import"}
        </button>
      </div>
      {toast.node}
    </form>
  );
}

/** Which card, which line, and what is wrong with it. */
function Problems({
  issues,
  error,
}: {
  issues: { line: number | null; message: string }[];
  error: string | null;
}) {
  return (
    <div className="problems">
      <p className="problems__head">
        <Icon name="alert" />
        {error ?? `${issues.length} problem${issues.length === 1 ? "" : "s"} — nothing will be imported`}
      </p>
      <ul>
        {issues.slice(0, 12).map((issue, i) => (
          <li key={i}>
            <b>{issue.line === null ? "—" : `Line ${issue.line}`}</b>
            <span>{issue.message}</span>
          </li>
        ))}
      </ul>
      {issues.length > 12 && <p className="problems__more">…and {issues.length - 12} more.</p>}
    </div>
  );
}
