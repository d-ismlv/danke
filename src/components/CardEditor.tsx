"use client";

import {
  useRef,
  useEffect,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import { useFormStatus } from "react-dom";
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

type EmbeddedImage = {
  alt: string;
  url: string;
  markdown: string;
  start: number;
  end: number;
};

function embeddedImages(markdown: string): EmbeddedImage[] {
  const images: EmbeddedImage[] = [];
  const pattern = /!\[([^\]]*)\]\((\/api\/media\/[A-Za-z0-9_-]{1,64})\)/g;
  for (const match of markdown.matchAll(pattern)) {
    if (match.index === undefined) continue;
    images.push({
      alt: match[1] || "image",
      url: match[2],
      markdown: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return images;
}

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
  autoFocus = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const images = embeddedImages(value);

  const wrapSelection = (
    prefix: string,
    suffix: string,
    placeholder: string,
  ) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? start;
    const selection = value.slice(start, end) || placeholder;
    const replacement = `${prefix}${selection}${suffix}`;
    onChange(`${value.slice(0, start)}${replacement}${value.slice(end)}`);
    setMobileView("edit");

    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selection.length,
      );
    });
  };

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

  const replaceImage = async (embedded: EmbeddedImage, file: File) => {
    if (uploading) return;
    setUploading(true);
    setError(null);
    try {
      const image = await uploadImage(file);
      const replacement = `![${markdownAlt(image.name)}](${image.url})`;
      onChange(
        `${value.slice(0, embedded.start)}${replacement}${value.slice(embedded.end)}`,
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The image could not be replaced.",
      );
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (embedded: EmbeddedImage) => {
    const nextValue = `${value.slice(0, embedded.start)}${value.slice(embedded.end)}`
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\n+/, "")
      .trimEnd();
    onChange(nextValue);
    setError(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <label
          htmlFor={`card-${name}`}
          className="text-xs font-medium uppercase tracking-wide text-muted"
        >
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1" aria-label={`${label} formatting`}>
          <button
            type="button"
            title="Bold"
            aria-label="Bold"
            onClick={() => wrapSelection("**", "**", "bold text")}
            className="button-quiet min-h-8 min-w-8 px-2 font-bold"
          >
            B
          </button>
          <button
            type="button"
            title="Italic"
            aria-label="Italic"
            onClick={() => wrapSelection("_", "_", "italic text")}
            className="button-quiet min-h-8 min-w-8 px-2 italic"
          >
            I
          </button>
          <button
            type="button"
            title="Inline code"
            aria-label="Inline code"
            onClick={() => wrapSelection("`", "`", "code")}
            className="button-quiet min-h-8 min-w-8 px-2 font-mono"
          >
            &lt;/&gt;
          </button>
          <button
            type="button"
            title="Link"
            aria-label="Link"
            onClick={() => wrapSelection("[", "](https://)", "link text")}
            className="button-quiet min-h-8 px-2 text-xs"
          >
            Link
          </button>
        </div>
        <div className="flex rounded-lg bg-surface-2 p-1 md:hidden">
          {(["edit", "preview"] as const).map((view) => (
            <button
              key={view}
              type="button"
              aria-pressed={mobileView === view}
              onClick={() => setMobileView(view)}
              className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
                mobileView === view
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted"
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <textarea
          id={`card-${name}`}
          ref={textareaRef}
          name={name}
          value={value}
          autoFocus={autoFocus}
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
          } ${mobileView === "preview" ? "hidden md:block" : ""}`}
        />
        <div
          aria-label={`${label} preview`}
          className={`min-h-56 min-w-0 overflow-auto rounded-[18px] border border-border bg-surface/70 p-4 ${
            mobileView === "edit" ? "hidden md:block" : ""
          }`}
        >
          {value.trim() ? (
            <Markdown variant="preview">{value}</Markdown>
          ) : (
            <span className="text-sm text-muted">Preview</span>
          )}
        </div>
      </div>
      {images.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-2/55 p-2">
          <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Attached {images.length === 1 ? "image" : `images · ${images.length}`}
          </div>
          <ul className="flex flex-col gap-1.5">
            {images.map((image) => (
              <li
                key={`${image.url}-${image.start}`}
                className="flex items-center gap-2 rounded-lg bg-surface p-2"
              >
                {/* Stored Markdown images have runtime URLs and dimensions. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className="size-10 shrink-0 rounded-md border border-border object-cover"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {image.alt}
                </span>
                <label
                  className={`button-quiet min-h-8 cursor-pointer px-2 text-xs ${
                    uploading ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  Replace
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={uploading}
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void replaceImage(image, file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeImage(image)}
                  className="button-danger min-h-8 px-2 text-xs"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p
        aria-live="polite"
        className={`min-h-4 text-xs ${error ? "text-again" : "text-muted"}`}
      >
        {error ?? (uploading ? "Saving image locally…" : "")}
      </p>
    </section>
  );
}

function SubmitControls({
  deckId,
  dirty,
  isEdit,
}: {
  deckId: string;
  dirty: boolean;
  isEdit: boolean;
}) {
  const { pending } = useFormStatus();
  const [intent, setIntent] = useState<"save" | "another">("save");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        onClick={() => setIntent("save")}
        className="button-primary"
      >
        {pending && intent === "save"
          ? isEdit
            ? "Saving…"
            : "Adding…"
          : isEdit
            ? "Save changes"
            : "Add card"}
      </button>
      {!isEdit && (
        <button
          type="submit"
          name="addAnother"
          value="1"
          disabled={pending}
          onClick={() => setIntent("another")}
          className="button-secondary"
        >
          {pending && intent === "another" ? "Adding…" : "Save & add another"}
        </button>
      )}
      <Link
        href={`/decks/${deckId}`}
        className={`button-quiet ${pending ? "pointer-events-none opacity-50" : ""}`}
        onClick={(event) => {
          if (dirty && !window.confirm("Discard your unsaved changes?")) {
            event.preventDefault();
          }
        }}
      >
        Cancel
      </Link>
      <span className="text-xs text-muted" aria-live="polite">
        {pending ? "Saving locally…" : dirty ? "Unsaved changes" : ""}
      </span>
    </div>
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

      <Field
        label="Front"
        name="front"
        value={front}
        onChange={setFront}
        autoFocus={!isEdit}
      />
      <Field label="Back" name="back" value={back} onChange={setBack} />

      <SubmitControls deckId={deckId} dirty={dirty} isEdit={isEdit} />
    </form>
  );
}
