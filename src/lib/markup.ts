/**
 * The card's inline markup, and nothing else.
 *
 * A card is a question and two to six points; the only formatting any of them
 * carries is **bold**, *italic*, `code`, and **`bold code`**. That is four
 * rules, so this is a tokenizer rather than a markdown pipeline — the app used
 * to ship react-markdown, remark-gfm, remark-math, rehype-katex and KaTeX's
 * stylesheet to render text that is never allowed a heading, a table, a link
 * or an image.
 *
 * It returns a tree, not HTML. Nothing here can emit markup, so card content
 * cannot become markup no matter what an import contains.
 */

type Mark = "strong" | "em" | "code";

export type InlineNode = string | { mark: Mark; children: InlineNode[] };

/**
 * Ordered alternation, and the order is the precedence:
 *
 * - `code` first, so asterisks inside a code span stay literal;
 * - `**strong**` before `*em*`, so the pair of asterisks is never read as one;
 * - each delimiter must hug its content (`*a*`, never `a * b * c`), which is
 *   what keeps prose containing a lone asterisk from turning italic halfway.
 *
 * Held as a source string, not a RegExp. A global regex carries `lastIndex`
 * between calls, and this function recurses into its own matches — one shared
 * instance lets a nested parse rewind the parse that started it, which does not
 * terminate.
 */
const TOKEN = String.raw`\`([^\`\n]+)\`|\*\*(?!\s)([\s\S]+?)(?<!\s)\*\*|\*(?!\s)([^*\n]+?)(?<!\s)\*`;

export function parseInline(text: string): InlineNode[] {
  const token = new RegExp(TOKEN, "g");
  const nodes: InlineNode[] = [];
  let cursor = 0;

  for (let m = token.exec(text); m !== null; m = token.exec(text)) {
    if (m.index > cursor) nodes.push(text.slice(cursor, m.index));
    if (m[1] !== undefined) {
      // Code is opaque: its contents are never markup.
      nodes.push({ mark: "code", children: [m[1]] });
    } else if (m[2] !== undefined) {
      nodes.push({ mark: "strong", children: parseInline(m[2]) });
    } else {
      nodes.push({ mark: "em", children: parseInline(m[3]) });
    }
    cursor = m.index + m[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
