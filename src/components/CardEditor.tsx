"use client";

import {
  useRef,
  useEffect,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import Link from "next/link";
import Markdown from "./Markdown";
import { createCard, updateCard } from "@/lib/actions";

type Props = {
  deckId: string;
  card?: { id: string; front: string; back: string };
};

type UploadResult = {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
};

function markdownAlt(name: string): string {
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  return withoutExtension.replace(/[\[\]]/g, "").trim() || "image";
}

async function uploadImage(file: File): Promise<UploadResult> {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch("/api/media", { method: "POST", body });
  const result = (await response.json().catch(() => null)) as
    | (Partial<UploadResult> & { error?: string })
    | null;
  if (!response.ok || !result?.url || !result.name) {
    throw new Error(result?.error || "The image could not be uploaded.");
  }
  return result as UploadResult;
}

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insertImage = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    setError(null);

    try {
      const image = await uploadImage(file);
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? value.length;
      const end = textarea?.selectionEnd ?? start;
      const before = value.slice(0, start);
      const after = value.slice(end);
      const prefix = before && !before.endsWith("\n") ? "\n\n" : "";
      const suffix = after && !after.startsWith("\n") ? "\n\n" : "";
      const markdown = `![${markdownAlt(image.name)}](${image.url})`;
      const nextValue = `${before}${prefix}${markdown}${suffix}${after}`;
      const nextCursor = before.length + prefix.length + markdown.length;
      onChange(nextValue);

      requestAnimationFrame(() => {
        textarea?.focus();
        textarea?.setSelectionRange(nextCursor, nextCursor);
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The image could not be uploaded.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const image = Array.from(event.clipboardData.files).find((file) =>
      file.type.startsWith("image/"),
    );
    if (!image) return;
    event.preventDefault();
    void insertImage(image);
  };

  const onDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setDragging(false);
    const image = Array.from(event.dataTransfer.files).find((file) =>
      file.type.startsWith("image/"),
    );
    if (image) void insertImage(image);
  };

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <label className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted sm:inline">
            Drop or paste an image
          </span>
          <label
            className={`cursor-pointer rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium transition hover:border-accent hover:text-accent ${
              uploading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {uploading ? "Uploading…" : "+ Image"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={uploading}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void insertImage(file);
              }}
            />
          </label>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <textarea
          ref={textareaRef}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={onPaste}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          rows={9}
          placeholder="Markdown…"
          className={`min-h-56 w-full min-w-0 resize-y rounded-[18px] border bg-surface p-4 font-mono text-sm leading-6 outline-none transition focus:border-accent ${
            dragging ? "border-accent ring-2 ring-accent/15" : "border-border"
          }`}
        />
        <div className="min-h-56 min-w-0 overflow-auto rounded-[18px] border border-border bg-surface/70 p-4">
          {value.trim() ? (
            <Markdown variant="preview">{value}</Markdown>
          ) : (
            <span className="text-sm text-muted">Preview</span>
          )}
        </div>
      </div>
      <p
        aria-live="polite"
        className={`min-h-4 text-xs ${error ? "text-again" : "text-muted"}`}
      >
        {error ?? (uploading ? "Saving image locally…" : "")}
      </p>
    </section>
  );
}

export default function CardEditor({ deckId, card }: Props) {
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(card?.back ?? "");
  const isEdit = Boolean(card);
  const dirty = front !== (card?.front ?? "") || back !== (card?.back ?? "");

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  return (
    <form action={isEdit ? updateCard : createCard} className="flex flex-col gap-7">
      <input type="hidden" name="deckId" value={deckId} />
      {card && <input type="hidden" name="id" value={card.id} />}

      <Field label="Front" name="front" value={front} onChange={setFront} />
      <Field label="Back" name="back" value={back} onChange={setBack} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="button-primary"
        >
          {isEdit ? "Save changes" : "Add card"}
        </button>
        {!isEdit && (
          <button
            type="submit"
            name="addAnother"
            value="1"
            className="button-secondary"
          >
            Add &amp; new
          </button>
        )}
        <Link
          href={`/decks/${deckId}`}
          className="button-quiet"
          onClick={(event) => {
            if (dirty && !window.confirm("Discard your unsaved changes?")) {
              event.preventDefault();
            }
          }}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
