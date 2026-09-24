import { Fragment } from "react";
import { parseInline, type InlineNode } from "@/lib/markup";

const TAG = { strong: "strong", em: "em", code: "code" } as const;

function render(nodes: InlineNode[], links: boolean): React.ReactNode {
  return nodes.map((node, i) => {
    if (typeof node === "string") return <Fragment key={i}>{node}</Fragment>;
    if (node.mark === "link") {
      if (!links) return <Fragment key={i}>{render(node.children, links)}</Fragment>;
      /* A new tab, because this tab is holding a study session whose queue
         lives in the page — following a link here would end it. No referrer,
         because the page on the other end has no business learning where a
         self-hosted app lives. */
      return (
        <a
          key={i}
          href={node.href}
          title={node.title}
          className="card-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {render(node.children, links)}
        </a>
      );
    }
    const Tag = TAG[node.mark];
    return (
      <Tag key={i} className={node.mark === "code" ? "code" : undefined}>
        {render(node.children, links)}
      </Tag>
    );
  });
}

/**
 * One line of card text: bold, italic, code, bold code, and links.
 *
 * `links={false}` draws a link as its words alone, for text that sits inside
 * something already clickable — an `<a>` inside a `<button>` is invalid, and a
 * click on it would have to mean two things at once.
 */
export default function Inline({ children, links = true }: { children: string; links?: boolean }) {
  return <>{render(parseInline(children), links)}</>;
}
