/**
 * The card's inline markup, and nothing else.
 *
 * A card is a question and its points; the only formatting any of them carries
 * is **bold**, *italic*, `code`, **`bold code`** and [links](https://…). That
 * is five rules, so this is a tokenizer rather than a markdown pipeline — the
 * app used to ship react-markdown, remark-gfm, remark-math, rehype-katex and
 * KaTeX's stylesheet to render text that is never allowed a heading, a table
 * or an image.
 *
 * It returns a tree, not HTML. Nothing here can emit markup, so card content
 * cannot become markup no matter what an import contains — and a link only
 * enters the tree carrying a web address, so it cannot become a script either.
 */

export type InlineNode =
  | string
  | { mark: "strong" | "em" | "code"; children: InlineNode[] }
  | { mark: "link"; href: string; title?: string; children: InlineNode[] };

/**
 * Ordered alternation, and the order is the precedence:
 *
 * - `code` first, so asterisks and brackets inside a code span stay literal;
 * - `[text](address)` next. Its text holds no brackets, so a link can never
 *   end up inside another one, and its address may hold one pair of
 *   parentheses — `Kerberos_(protocol)` is a real page name — followed by an
 *   optional `"title"`;
 * - `**strong**` before `*em*`, so the pair of asterisks is never read as one;
 * - each delimiter must hug its content (`*a*`, never `a * b * c`), which is
 *   what keeps prose containing a lone asterisk from turning italic halfway.
 *
 * Held as a source string, not a RegExp. A global regex carries `lastIndex`
 * between calls, and this function recurses into its own matches — one shared
 * instance lets a nested parse rewind the parse that started it, which does not
 * terminate.
 */
const TOKEN = [
  String.raw`\`([^\`\n]+)\``,
  String.raw`\[([^\[\]\n]+)\]\(((?:[^\s()]|\([^\s()]*\))+)(?:\s+"([^"\n]*)")?\)`,
  String.raw`\*\*(?!\s)([\s\S]+?)(?<!\s)\*\*`,
  String.raw`\*(?!\s)([^*\n]+?)(?<!\s)\*`,
].join("|");

export function parseInline(text: string): InlineNode[] {
  return tokenize(text, () => {});
}

/**
 * The addresses of every link in `text` that will not become one, for the
 * importer to report — the tokenizer is the only thing that knows what a link
 * is, so it is also the thing that says which ones it turned down.
 */
export function unusableLinks(text: string): string[] {
  const refused: string[] = [];
  tokenize(text, (href) => refused.push(href));
  return refused;
}

function tokenize(text: string, refuse: (href: string) => void): InlineNode[] {
  const token = new RegExp(TOKEN, "g");
  const nodes: InlineNode[] = [];
  let cursor = 0;

  for (let m = token.exec(text); m !== null; m = token.exec(text)) {
    if (m[2] !== undefined && !isWebAddress(m[3])) {
      // Not a link, so not a token: step over the bracket and read on as if
      // this rule did not exist. `javascript:` and friends never reach an
      // href, and a card written before links existed reads as it always did.
      refuse(m[3]);
      token.lastIndex = m.index + 1;
      continue;
    }
    if (m.index > cursor) nodes.push(text.slice(cursor, m.index));
    if (m[1] !== undefined) {
      // Code is opaque: its contents are never markup.
      nodes.push({ mark: "code", children: [m[1]] });
    } else if (m[2] !== undefined) {
      nodes.push({
        mark: "link",
        href: m[3],
        ...(m[4] ? { title: m[4] } : {}),
        children: tokenize(m[2], refuse),
      });
    } else if (m[5] !== undefined) {
      nodes.push({ mark: "strong", children: tokenize(m[5], refuse) });
    } else {
      nodes.push({ mark: "em", children: tokenize(m[6], refuse) });
    }
    cursor = m.index + m[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

/** `http:` and `https:`, whole and parseable — a card links out to the web and
 * nowhere else, and `https://` with nothing after it is not a page. */
function isWebAddress(href: string): boolean {
  try {
    const { protocol } = new URL(href);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
