/**
 * Parsing for bulk card import. Pure and dependency-free so both the client
 * preview and the server action share one implementation.
 */

export const SEPARATORS = {
  tab: "\t",
  comma: ",",
  semicolon: ";",
  pipe: "|",
} as const;

export type SeparatorKey = keyof typeof SEPARATORS;

export type ParsedCard = { front: string; back: string };

/**
 * One card per non-empty line; front/back split on the first occurrence of the
 * separator. A line with no separator becomes a front-only card. Markdown is
 * preserved verbatim within each field.
 */
export function parseCards(text: string, sepKey: SeparatorKey): ParsedCard[] {
  const sep = SEPARATORS[sepKey] ?? "\t";
  const cards: ParsedCard[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const idx = line.indexOf(sep);
    const front = (idx === -1 ? line : line.slice(0, idx)).trim();
    const back = idx === -1 ? "" : line.slice(idx + sep.length).trim();
    if (!front && !back) continue;
    cards.push({ front, back });
  }
  return cards;
}
