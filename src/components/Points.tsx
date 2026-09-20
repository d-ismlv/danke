import Inline from "./Inline";
import type { List } from "@/lib/parse";

/**
 * A card's answer.
 *
 * The topic screen, the study card and the import preview all show the same
 * list, so they all show it through here — a point's sub-points are part of
 * what the point says, and a preview that drew them differently from the card
 * would be a preview of something else. The markers come from the list itself:
 * `<ol>` does its own counting, so what is stored is the point, never its
 * number.
 */
export default function Points({ list, className }: { list: List; className?: string }) {
  const Tag = list.ordered ? "ol" : "ul";
  return (
    <Tag className={className}>
      {list.items.map((item, i) => (
        <li key={i}>
          <Inline>{item.text}</Inline>
          {item.list && item.list.items.length > 0 && <Points list={item.list} />}
        </li>
      ))}
    </Tag>
  );
}
