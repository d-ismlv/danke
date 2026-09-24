"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { importCards, type ImportState } from "@/lib/actions";
import { parseCards, TEMPLATE } from "@/lib/parse";
import { useIndent } from "@/lib/indent";
import Inline from "./Inline";
import Points from "./Points";
import Icon from "./Icon";
import { useToast } from "./Toast";

type DeckOption = { id: string; name: string; topics: { id: string; name: string }[] };

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
  const lines = useMemo(() => text.split("\n"), [text]);
  const mirror = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const onKeyDown = useIndent();

  /** Keep the highlight layer under the part of the text you are looking at. */
  function syncScroll(field: HTMLTextAreaElement) {
    if (!mirror.current) return;
    mirror.current.scrollTop = field.scrollTop;
    mirror.current.scrollLeft = field.scrollLeft;
  }

  /*
   * The highlight layer has to wrap its text at exactly the width the textarea
   * does, or a highlight drifts off the line it belongs to. `inset: 0` is not
   * that width: a textarea's scrollbar is taken out of its content box, so the
   * moment the text overflows — or the window is resized across that
   * threshold — the two layers disagree and the highlights jump.
   *
   * `clientWidth`/`clientHeight` are the padding box, scrollbar already
   * excluded, which is precisely what the mirror should be.
   */
  useEffect(() => {
    const field = input.current;
    const layer = mirror.current;
    if (!field || !layer) return;
    const match = () => {
      layer.style.width = `${field.clientWidth}px`;
      layer.style.height = `${field.clientHeight}px`;
      layer.scrollTop = field.scrollTop;
      layer.scrollLeft = field.scrollLeft;
    };
    match();
    const observer = new ResizeObserver(match);
    observer.observe(field);
    return () => observer.disconnect();
  }, []);

  const destinationReady = creatingDeck ? newDeck.trim() !== "" : deckId !== "";
  const topicReady = creatingTopic ? newTopic.trim() !== "" : topicId !== "";
  const contentReady = text.trim().length > 0 && parsed.issues.length === 0;
  const ready = destinationReady && topicReady && contentReady;

  return (
    <form action={action}>
      <section className="destination-panel" aria-labelledby="destination-title">
        <header className="section-heading">
          <div>
            <h2 id="destination-title">Destination</h2>
          </div>
        </header>
        <div className="destination-grid">
          <div className="destination-field">
            <label htmlFor="import-deck">Deck</label>
            <div className="destination-control">
              <select
                id="import-deck"
                value={deckId}
                disabled={creatingDeck || decks.length === 0}
                onChange={(event) => chooseDeck(event.target.value)}
              >
                {decks.length === 0 && <option value="">No decks yet</option>}
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="inline-action"
                aria-expanded={creatingDeck}
                aria-controls="new-deck-field"
                onClick={toggleNewDeck}
              >
                {creatingDeck && decks.length > 0 ? "Use existing" : "+ New deck"}
              </button>
            </div>
            {creatingDeck && (
              <label className="create-inline" id="new-deck-field">
                <span>New deck name</span>
                <input
                  type="text"
                  name="newDeck"
                  value={newDeck}
                  maxLength={120}
                  placeholder="e.g. Endpoint Security"
                  onChange={(event) => setNewDeck(event.target.value)}
                />
              </label>
            )}
          </div>

          <div className="destination-field">
            <label htmlFor="import-topic">Topic</label>
            <div className="destination-control">
              <select
                id="import-topic"
                value={topicId}
                disabled={creatingTopic || topics.length === 0}
                onChange={(event) => setTopicId(event.target.value)}
              >
                {topics.length === 0 && <option value="">No topics yet</option>}
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="inline-action"
                aria-expanded={creatingTopic}
                aria-controls="new-topic-field"
                disabled={topics.length === 0}
                onClick={() => setCreatingTopic((v) => topics.length === 0 || !v)}
              >
                {creatingTopic && topics.length > 0 ? "Use existing" : "+ New topic"}
              </button>
            </div>
            {creatingTopic && (
              <label className="create-inline" id="new-topic-field">
                <span>New topic name</span>
                <input
                  type="text"
                  name="newTopic"
                  value={newTopic}
                  maxLength={120}
                  placeholder="e.g. Resource-based delegation"
                  onChange={(event) => setNewTopic(event.target.value)}
                />
              </label>
            )}
          </div>
        </div>
        {/* The pickers are local state; these carry what the server should act
            on. A disabled select submits nothing at all. */}
        <input type="hidden" name="deckId" value={creatingDeck ? "" : deckId} />
        <input
          type="hidden"
          name="topicId"
          value={creatingDeck || creatingTopic ? "" : topicId}
        />
      </section>

      <section className="import-workspace" aria-label="Markdown import">
        <div className="import-editor">
          <header className="import-panel-heading">
            <div>
              <h2>Markdown</h2>
            </div>
            <button
              type="button"
              className="text-action"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(TEMPLATE);
                  toast.show("The Markdown template has been copied.");
                } catch {
                  toast.show("Your browser would not let the app copy. Select and copy instead.");
                }
              }}
            >
              Copy template
            </button>
          </header>
          {/* The highlights are a second copy of the text sitting behind a
              transparent textarea, in the same font, padding and wrapping — a
              textarea cannot style one of its own lines. */}
          <div className="markdown-editor">
            <div className="markdown-lines" ref={mirror} aria-hidden="true">
              {lines.map((line, i) => (
                <span key={i} className={badLines.has(i + 1) ? "is-bad" : undefined}>
                  {line === "" ? "\u200b" : line}
                </span>
              ))}
            </div>
            <textarea
              ref={input}
              className="markdown-input"
              name="text"
              aria-label="Markdown cards"
              spellCheck={false}
              value={text}
              placeholder={"# Your question?\n\n- First answer point\n- Second answer point"}
              onChange={(event) => {
                setText(event.target.value);
                syncScroll(event.currentTarget);
              }}
              onScroll={(event) => syncScroll(event.currentTarget)}
              onKeyDown={onKeyDown}
            />
          </div>
          <div className="format-guide">
            <strong>Expected format</strong>
            <span>
              <code>#</code> a question, then its points — <code>-</code> for bullets,{" "}
              <code>1.</code> to number them, Tab to nest one under the point above
            </span>
            <span>
              Supports <strong>bold</strong>, <em>italic</em>, <code>inline code</code>,{" "}
              <strong>
                <code>bold code</code>
              </strong>
              , and links as <code>[text](https://…)</code>
            </span>
          </div>
        </div>

        <div className="import-preview">
          <header className="import-panel-heading">
            <div>
              <h2>Preview</h2>
            </div>
          </header>

          {text.trim().length === 0 ? (
            <p className="import-hint">Paste your cards above to see exactly what will be imported.</p>
          ) : issues.length > 0 ? (
            <Problems issues={issues} error={state.error} />
          ) : (
            /* Every parsed card, mounted, in document order. Scrolling right
               moves through the set; nothing is swapped out behind a counter. */
            <div
              className="preview-track"
              tabIndex={0}
              role="group"
              aria-label={`${parsed.cards.length} parsed card${parsed.cards.length === 1 ? "" : "s"}, scroll right for more`}
              onKeyDown={stepPreview}
            >
              {parsed.cards.map((card, i) => (
                <article className="import-card-preview" key={i}>
                  <span>
                    Card {i + 1} / {parsed.cards.length}
                  </span>
                  <h3>
                    <Inline>{card.title}</Inline>
                  </h3>
                  <Points list={card.points} />
                </article>
              ))}
            </div>
          )}

          <div className="import-result">
            <span className={`validation-status${issues.length > 0 && text.trim() ? " validation-status--bad" : ""}${text.trim() ? "" : " validation-status--idle"}`}>
              {status(text, parsed.cards.length, issues.length)}
            </span>
            <button type="submit" className="primary-action" disabled={!ready || pending}>
              <Icon name="import" />
              {pending
                ? "Importing…"
                : contentReady
                  ? `Import ${parsed.cards.length} card${parsed.cards.length === 1 ? "" : "s"}`
                  : "Import"}
            </button>
          </div>
        </div>
      </section>
      {toast.node}
    </form>
  );
}

/**
 * Arrow keys move the preview a card at a time, and Home/End jump to the ends.
 * A focused scroll container scrolls with the arrows on its own, but only by a
 * line — which lands between two cards and fights the snap points.
 */
function stepPreview(event: React.KeyboardEvent<HTMLDivElement>) {
  const track = event.currentTarget;
  const card = track.firstElementChild as HTMLElement | null;
  const step = card ? card.getBoundingClientRect().width + 16 : track.clientWidth;
  const moves: Record<string, number | "start" | "end"> = {
    ArrowRight: step,
    ArrowLeft: -step,
    Home: "start",
    End: "end",
  };
  const move = moves[event.key];
  if (move === undefined) return;
  event.preventDefault();
  if (move === "start") track.scrollTo({ left: 0 });
  else if (move === "end") track.scrollTo({ left: track.scrollWidth });
  else track.scrollBy({ left: move });
}

function status(text: string, cards: number, issues: number): string {
  if (text.trim().length === 0) return "Nothing to import yet";
  if (issues > 0) return `${issues} problem${issues === 1 ? "" : "s"} · nothing will be imported`;
  return `Valid · ${cards} card${cards === 1 ? "" : "s"}`;
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
    <div className="import-problems">
      <p>
        <Icon name="alert" />
        {error ??
          `${issues.length} problem${issues.length === 1 ? "" : "s"} — nothing will be imported`}
      </p>
      <ul>
        {issues.slice(0, 12).map((issue, i) => (
          <li key={i}>
            <b>{issue.line === null ? "—" : `Line ${issue.line}`}</b>
            <span>{issue.message}</span>
          </li>
        ))}
      </ul>
      {issues.length > 12 && <p className="import-problems__more">…and {issues.length - 12} more.</p>}
    </div>
  );
}
