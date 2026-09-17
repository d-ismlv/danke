"use client";

import { useActionState, useState } from "react";
import { saveCard, deleteCard, type CardState } from "@/lib/actions";
import { MIN_POINTS, MAX_POINTS } from "@/lib/parse";
import type { CardRow } from "@/lib/queries";
import Inline from "./Inline";
import Icon from "./Icon";

/** Four states, one dot each: unseen, learning, learned, due. The dot is the
 * same reading as the progress bars — filled means the card is holding. */
function Dot({ state, due, at }: { state: number | null; due: number | null; at: number }) {
  const overdue = due !== null && due <= at;
  const tone =
    overdue ? "bg-due" : state === 2 ? "bg-accent" : state === 1 || state === 3 ? "bg-accent/40" : "bg-surface-2 ring-1 ring-border-strong";
  const label = overdue ? "Due" : state === 2 ? "Learned" : state === 0 || state === null ? "Unseen" : "Learning";
  return <span title={label} aria-label={label} className={`size-2 shrink-0 rounded-full ${tone}`} />;
}

export default function CardList({
  cards,
  topicId,
  at,
}: {
  cards: CardRow[];
  topicId: string;
  at: number;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <ul className="panel divide-hairline overflow-hidden">
      {cards.map((card) => {
        const isEditing = editing === card.id;
        const isOpen = open === card.id;
        return (
          <li key={card.id}>
            {isEditing ? (
              <Editor card={card} topicId={topicId} onDone={() => setEditing(null)} />
            ) : (
              <div className="group flex flex-col">
                <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <Dot state={card.state} due={card.due} at={at} />
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : card.id)}
                    aria-expanded={isOpen}
                    className="min-w-0 flex-1 text-left text-[0.95rem] font-medium leading-snug text-pretty transition-colors hover:text-accent"
                  >
                    <Inline>{card.title}</Inline>
                  </button>
                  <span
                    className="num shrink-0 text-xs text-faint"
                    title={`${card.points.length} points`}
                  >
                    {card.points.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(card.id)}
                    title="Edit card"
                    className="btn-ghost size-8 shrink-0 px-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Icon name="pencil" size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : card.id)}
                    aria-label={isOpen ? "Hide points" : "Show points"}
                    className="btn-ghost size-8 shrink-0 px-0"
                  >
                    <Icon
                      name="chevron"
                      size={15}
                      className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
                {isOpen && (
                  <ol className="anim-fade flex flex-col gap-2 border-t bg-surface-2/40 px-4 py-4 pl-9 text-sm sm:px-5 sm:pl-10">
                    {card.points.map((point, i) => (
                      <li key={i} className="grid grid-cols-[1.4rem_1fr] items-baseline leading-relaxed">
                        <span className="num text-xs text-faint">{i + 1}</span>
                        <span>
                          <Inline>{point}</Inline>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
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
  const [points, setPoints] = useState(card.points.join("\n"));

  const [state, action, pending] = useActionState<CardState, FormData>(
    async (prev, data) => {
      const result = await saveCard(prev, data);
      if (!result.error) onDone();
      return result;
    },
    { error: null },
  );

  return (
    <div className="bg-surface-2/40 px-4 py-4 sm:px-5">
      <form id={`edit-${card.id}`} action={action} className="flex flex-col gap-3">
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
            className="input"
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
            className="textarea min-h-32"
          />
        </div>
        {state.error && (
          <p className="flex items-center gap-2 text-sm text-again">
            <Icon name="alert" size={15} />
            {state.error}
          </p>
        )}
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" form={`edit-${card.id}`} disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className="btn-ghost">
          Cancel
        </button>
        <span className="flex-1" />
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
      <button type="button" onClick={() => setArmed(true)} className="btn-danger">
        <Icon name="trash" size={15} />
        Delete
      </button>
    );
  }
  return (
    <form action={deleteCard} className="flex items-center gap-2 text-sm">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="topicId" value={topicId} />
      <span className="text-muted">Delete this card?</span>
      <button type="submit" className="btn-danger">
        Delete
      </button>
      <button type="button" onClick={() => setArmed(false)} className="btn-ghost">
        Cancel
      </button>
    </form>
  );
}
