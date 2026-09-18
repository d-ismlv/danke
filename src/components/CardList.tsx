"use client";

import { useActionState, useId, useState } from "react";
import { saveCard, deleteCard, type CardState } from "@/lib/actions";
import { MIN_POINTS, MAX_POINTS } from "@/lib/parse";
import type { CardRow } from "@/lib/queries";
import { cardMark, MARK_LABEL, type CardMark } from "@/lib/status";
import Inline from "./Inline";
import Icon from "./Icon";

/**
 * The questions in a topic. Every row is closed when the screen is entered;
 * opening one tints its header and reveals the points underneath.
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

  return (
    <div className="question-list">
      {cards.map((card, index) => {
        const isOpen = open === card.id;
        const answerId = `${prefix}-answer-${index}`;
        const mark = cardMark(card, at);
        return (
          <article className="question" key={card.id}>
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
              <span className="question-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="question-prompt">
                <strong>
                  <Inline>{card.title}</Inline>
                </strong>
              </span>
              <span className={stateClass(mark)}>{MARK_LABEL[mark]}</span>
              <Icon name="chevron" />
            </button>

            {isOpen && (
              <div className="question__answer" id={answerId}>
                {editing === card.id ? (
                  <Editor
                    card={card}
                    topicId={topicId}
                    onDone={() => setEditing(null)}
                  />
                ) : (
                  <>
                    <ul>
                      {card.points.map((point, i) => (
                        <li key={i}>
                          <Inline>{point}</Inline>
                        </li>
                      ))}
                    </ul>
                    <div className="card-tools">
                      <button
                        type="button"
                        className="ghost-action"
                        onClick={() => setEditing(card.id)}
                      >
                        <Icon name="pencil" />
                        Edit card
                      </button>
                      <DeleteCard id={card.id} topicId={topicId} />
                    </div>
                  </>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function stateClass(mark: CardMark): string {
  return mark === "mature" ? "question-state" : `question-state question-state--${mark}`;
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
  const [points, setPoints] = useState(card.points.join("\n"));

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
    <div className="card-editor">
      <form id={formId} action={action}>
        <input type="hidden" name="id" value={card.id} />
        <div>
          <label htmlFor={`t-${card.id}`} className="field-label">
            Question
          </label>
          <input
            id={`t-${card.id}`}
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="text-field"
          />
        </div>
        <div>
          <label htmlFor={`p-${card.id}`} className="field-label">
            Points — one per line, {MIN_POINTS} to {MAX_POINTS}
          </label>
          <textarea
            id={`p-${card.id}`}
            name="points"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            required
            className="text-field"
          />
        </div>
        {state.error && (
          <p className="form-error">
            <Icon name="alert" />
            {state.error}
          </p>
        )}
      </form>
      <div className="card-tools">
        <button type="submit" form={formId} disabled={pending} className="primary-action">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className="ghost-action">
          Cancel
        </button>
        <DeleteCard id={card.id} topicId={topicId} />
      </div>
    </div>
  );
}

/** Its own form: a delete nested inside the edit form would submit that one. */
function DeleteCard({ id, topicId }: { id: string; topicId: string }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className="danger-action">
        <Icon name="trash" />
        Delete
      </button>
    );
  }
  return (
    <form action={deleteCard} className="confirm-row">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="topicId" value={topicId} />
      <span>Delete this card?</span>
      <button type="submit" className="danger-action">
        Delete
      </button>
      <button type="button" onClick={() => setArmed(false)} className="ghost-action">
        Cancel
      </button>
    </form>
  );
}
