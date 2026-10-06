"use client";

import { useActionState, useId, useState } from "react";
import { saveCard, deleteCard, type CardState } from "@/lib/actions";
import { formatCard, formatPoints } from "@/lib/parse";
import type { CardRow } from "@/lib/queries";
import { cardMark } from "@/lib/status";
import Inline from "./Inline";
import Points from "./Points";
import Icon from "./Icon";
import { MarkPill } from "./Marks";
import { useToast } from "./Toast";
import { useIndent } from "@/lib/indent";

/**
 * The questions in a topic. Every row is closed when the screen is entered;
 * opening one lifts it out of the list and reveals the points underneath.
 *
 * Correcting a card lives inside the opened answer rather than on the row, so
 * a closed row is exactly the row it looks like — a question and how it is
 * going, with nothing hovering over it waiting to be clicked.
 */
export default function CardList({
  cards,
  topicId,
  at,
}: {
  cards: CardRow[];
  topicId: string;
  at: number;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const prefix = useId();
  const toast = useToast();

  /* The whole card in the format it was imported in — a selection only ever
     takes the words, and loses the heading and the list markers on the way. */
  const copy = async (card: CardRow) => {
    try {
      await navigator.clipboard.writeText(formatCard(card));
      toast.show("The card has been copied as Markdown.");
    } catch {
      toast.show("Your browser would not let the app copy. Select and copy instead.");
    }
  };

  return (
    <div className="questions">
      {cards.map((card, index) => {
        const isOpen = open === card.id;
        const answerId = `${prefix}-answer-${index}`;
        return (
          <article className={isOpen ? "question is-open" : "question"} key={card.id}>
            <button
              type="button"
              className="question__toggle"
              aria-expanded={isOpen}
              aria-controls={answerId}
              onClick={() => {
                setOpen(isOpen ? null : card.id);
                setEditing(null);
              }}
            >
              <span className="question__index no-copy">{String(index + 1).padStart(2, "0")}</span>
              <span className="question__title">
                {/* The whole row is the toggle; a link in the question is
                    followed from the study card instead. */}
                <Inline links={false}>{card.title}</Inline>
              </span>
              <span className="question__state no-copy">
                <MarkPill mark={cardMark(card, at)} />
              </span>
              <Icon name="chevron" className="question__chevron no-copy" />
            </button>

            {isOpen &&
              (editing === card.id ? (
                <Editor card={card} topicId={topicId} onDone={() => setEditing(null)} />
              ) : (
                <div className="question__body" id={answerId}>
                  <Points list={card.points} />
                  <div className="tools no-copy">
                    <button type="button" className="btn btn--ghost" onClick={() => setEditing(card.id)}>
                      <Icon name="pencil" />
                      Edit
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={() => copy(card)}>
                      <Icon name="copy" />
                      Copy as Markdown
                    </button>
                    <DeleteCard id={card.id} topicId={topicId} />
                  </div>
                </div>
              ))}
          </article>
        );
      })}
      {toast.node}
    </div>
  );
}

function Editor({
  card,
  topicId,
  onDone,
}: {
  card: CardRow;
  topicId: string;
  onDone: () => void;
}) {
  /* Controlled, not `defaultValue`: React resets a form's uncontrolled fields
     once its action resolves, so a rejected save handed back the original card
     and threw away whatever had just been typed. */
  const [title, setTitle] = useState(card.title);
  /* Seeded in the format the importer reads, markers and all: the box is the
     card's source, so opening it shows what the card is written in rather than
     a stripped copy that loses its bullets, its numbers and its nesting. */
  const [points, setPoints] = useState(() => formatPoints(card.points));
  const onKeyDown = useIndent();

  const [state, action, pending] = useActionState<CardState, FormData>(
    async (prev, data) => {
      const result = await saveCard(prev, data);
      if (!result.error) onDone();
      return result;
    },
    { error: null },
  );

  const formId = `edit-${card.id}`;

  return (
    /* The fields are their own form and the buttons sit outside it: a delete
       form nested inside the edit form would submit the edit. */
    <div className="editor">
      <form id={formId} action={action} className="editor__fields">
        <input type="hidden" name="id" value={card.id} />
        <label className="field">
          <span className="field__label">Question</span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="input"
          />
        </label>
        <label className="field">
          <span className="field__label">Points — one per line, Tab to nest</span>
          <textarea
            name="points"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            onKeyDown={onKeyDown}
            required
            spellCheck={false}
            className="textarea"
            rows={Math.min(16, points.split("\n").length + 2)}
          />
        </label>
        {state.error && (
          <p className="form-error" role="alert">
            <Icon name="alert" />
            {state.error}
          </p>
        )}
      </form>
      <div className="editor__actions">
        <button type="submit" form={formId} disabled={pending} className="btn btn--primary">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className="btn btn--ghost">
          Cancel
        </button>
        <span className="editor__end">
          <DeleteCard id={card.id} topicId={topicId} />
        </span>
      </div>
    </div>
  );
}

/** Its own form: a delete nested inside the edit form would submit that one. */
function DeleteCard({ id, topicId }: { id: string; topicId: string }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className="btn btn--ghost">
        <Icon name="trash" />
        Delete
      </button>
    );
  }
  return (
    <form
      action={deleteCard}
      className="confirm confirm--small"
      onKeyDown={(event) => event.key === "Escape" && setArmed(false)}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="topicId" value={topicId} />
      <span className="confirm__text">Delete this card?</span>
      <button type="submit" className="btn btn--dark">
        Delete
      </button>
      <button type="button" onClick={() => setArmed(false)} className="btn btn--plain" autoFocus>
        Cancel
      </button>
    </form>
  );
}
