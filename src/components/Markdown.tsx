"use client";

import { useEffect, useState, type ComponentPropsWithoutRef } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type Variant = "default" | "compact" | "preview" | "review";

function MarkdownImage({ src, alt, ...props }: ComponentPropsWithoutRef<"img">) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  if (!src) return null;

  return (
    <>
      <button
        type="button"
        className="markdown-image-trigger"
        onClick={(event) => {
          event.stopPropagation();
          setExpanded(true);
        }}
        aria-label={`Enlarge ${alt || "image"}`}
      >
        {/* User-authored Markdown images have unknown dimensions and sources. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          {...props}
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
          className="markdown-image"
        />
      </button>

      {expanded && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt || "Image preview"}
          className="image-lightbox"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            className="image-lightbox-close"
            onClick={() => setExpanded(false)}
            aria-label="Close image preview"
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt ?? ""}
            className="image-lightbox-content"
            onClick={(event) => event.stopPropagation()}
          />
        </div>,
        document.body,
      )}
    </>
  );
}

/** Renders card content as GitHub-flavored markdown with math support. */
export default function Markdown({
  children,
  variant = "default",
}: {
  children: string;
  variant?: Variant;
}) {
  return (
    <div className={`markdown markdown-${variant}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ img: MarkdownImage }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
