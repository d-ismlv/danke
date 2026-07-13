"use client";

import {
  useRef,
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
    <div className="flex flex-col gap-2">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <label className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted sm:inline">
            Drop or paste an image
          </span>
          <label
            className={`cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs font-medium transition hover:border-accent hover:text-accent ${
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
          rows={6}
          placeholder="Markdown…"
          className={`resize-y rounded-xl border bg-surface p-3 font-mono text-sm outline-none transition focus:border-accent ${
            dragging ? "border-accent ring-2 ring-accent/15" : "border-border"
          }`}
        />
        <div className="min-h-[9rem] overflow-auto rounded-xl border border-border bg-surface p-3">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
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
