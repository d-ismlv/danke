import { Fragment } from "react";
import { parseInline, type InlineNode } from "@/lib/markup";

const TAG = { strong: "strong", em: "em", code: "code" } as const;

function render(nodes: InlineNode[]): React.ReactNode {
  return nodes.map((node, i) => {
    if (typeof node === "string") return <Fragment key={i}>{node}</Fragment>;
    const Tag = TAG[node.mark];
    return (
      <Tag key={i} className={node.mark === "code" ? "code" : undefined}>
        {render(node.children)}
      </Tag>
    );
  });
}

/** One line of card text: bold, italic, code, and bold code. */
export default function Inline({ children }: { children: string }) {
  return <>{render(parseInline(children))}</>;
}
