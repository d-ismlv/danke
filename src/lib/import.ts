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

// ---- Ladder import ---------------------------------------------------------

/**
 * The second format: one markdown file per *concept*, carrying the whole
 * ladder. Line-based import can't express a card whose back is five bullets,
 * and a ladder needs to re-import over its own cards without resetting their
 * scheduling — so the unit here is a file, and every card carries a stable
 * `sourceKey`.
 *
 * ```markdown
 * ---
 * concept: kerberos.roasting
 * deck: AD / Kerberos
 * ---
 *
 * ## 1 :: What is Kerberoasting?
 * Offline password attack against **service accounts**.
 * ```
 *
 * Several files can be pasted one after another; each front-matter block that
 * names a concept starts a new ladder.
 */

/** Rungs of the ladder, in order. Index 0 is unused so `RUNG_NAMES[3]` reads. */
export const RUNG_NAMES = [
  "",
  "Name",
  "Mechanism",
  "Prerequisites",
  "Boundaries",
  "Breaks",
  "Detection",
  "Advice",
] as const;

export const MAX_RUNG = RUNG_NAMES.length - 1;

export type LadderCard = {
  /** `kerberos.roasting#2` — the import identity, unique per card. */
  sourceKey: string;
  conceptId: string;
  rung: number;
  front: string;
  back: string;
};

export type ParsedLadder = {
  conceptId: string;
  /** Deck path from front-matter, e.g. `["AD", "Kerberos"]`. Empty means the
   * deck the import was started from. */
  deckPath: string[];
  cards: LadderCard[];
};

export type LadderParseResult = {
  ladders: ParsedLadder[];
  /** Blocking: nothing is imported while any of these stand. */
  errors: string[];
  /** Advisory — the card rules from the authoring guide, not enforced. */
  warnings: string[];
};

const FRONT_MATTER_FENCE = /^---\s*$/;
const FRONT_MATTER_KEY = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/;
/** An indented continuation, so `sources:` can be a list the way an author
 * would write one. The parser keeps the values but uses none of them. */
const FRONT_MATTER_ITEM = /^\s+(?:-\s*)?(\S.*)$/;
const RUNG_HEADING = /^##\s+(\S+)\s*::\s*(.+?)\s*$/;
const ANY_H2 = /^##\s+/;
const CONCEPT_ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

/** Split the paste into concept blocks: a front-matter fence that declares a
 * `concept` key starts a new one. */
function splitBlocks(lines: string[]): {
  blocks: { meta: Map<string, string>; start: number; end: number; line: number }[];
  preamble: string;
} {
  const blocks: {
    meta: Map<string, string>;
    start: number;
    end: number;
    line: number;
  }[] = [];
  let i = 0;
  let firstStart = lines.length;

  while (i < lines.length) {
    if (!FRONT_MATTER_FENCE.test(lines[i])) {
      i += 1;
      continue;
    }
    // Collect key: value pairs until the closing fence.
    const meta = new Map<string, string>();
    let j = i + 1;
    let closed = false;
    let lastKey: string | null = null;
    while (j < lines.length) {
      if (FRONT_MATTER_FENCE.test(lines[j])) {
        closed = true;
        break;
      }
      const m = FRONT_MATTER_KEY.exec(lines[j]);
      if (m) {
        meta.set(m[1].toLowerCase(), m[2].trim());
        lastKey = m[1].toLowerCase();
        j += 1;
        continue;
      }
      const item = lastKey && FRONT_MATTER_ITEM.exec(lines[j]);
      if (item) {
        const existing = meta.get(lastKey!) ?? "";
        meta.set(lastKey!, existing ? `${existing}, ${item[1].trim()}` : item[1].trim());
        j += 1;
        continue;
      }
      break;
    }
    // A `---` that isn't a concept header is just a horizontal rule; skip it.
    if (!closed || !meta.has("concept")) {
      i += 1;
      continue;
    }
    if (blocks.length > 0) blocks[blocks.length - 1].end = i;
    else firstStart = i;
    blocks.push({ meta, start: j + 1, end: lines.length, line: i + 1 });
    i = j + 1;
  }

  return {
    blocks,
    preamble: lines.slice(0, firstStart).join("\n").trim(),
  };
}

/** Cards from one concept block: `## <rung> :: <question>` is the front, and
 * everything up to the next heading is the back. */
function parseBlockCards(
  conceptId: string,
  lines: string[],
  offset: number,
  errors: string[],
): LadderCard[] {
  const cards: LadderCard[] = [];
  let current: { rung: number; front: string; body: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const back = current.body.join("\n").trim();
    if (!back) {
      errors.push(`${conceptId}: rung ${current.rung} has no answer.`);
    }
    cards.push({
      sourceKey: `${conceptId}#${current.rung}`,
      conceptId,
      rung: current.rung,
      front: current.front,
      back,
    });
    current = null;
  };

  lines.forEach((line, idx) => {
    const heading = RUNG_HEADING.exec(line);
    if (heading) {
      flush();
      const rung = Number(heading[1]);
      if (!Number.isInteger(rung) || rung < 1 || rung > MAX_RUNG) {
        errors.push(
          `${conceptId}: line ${offset + idx + 1} — rung “${heading[1]}” is not 1-${MAX_RUNG}.`,
        );
        return;
      }
      current = { rung, front: heading[2], body: [] };
      return;
    }
    if (ANY_H2.test(line) && !current) {
      errors.push(
        `${conceptId}: line ${offset + idx + 1} — expected “## <rung> :: <question>”, got “${line.trim()}”.`,
      );
      return;
    }
    if (current) current.body.push(line);
    else if (line.trim()) {
      errors.push(
        `${conceptId}: line ${offset + idx + 1} — text outside any rung: “${line.trim().slice(0, 48)}”.`,
      );
    }
  });
  flush();
  return cards;
}

/** Card-shape rules from the authoring guide. Advisory only. */
function lintLadder(ladder: ParsedLadder, warnings: string[]): void {
  const seen = new Set<number>();
  for (const card of ladder.cards) {
    const where = `${ladder.conceptId}#${card.rung}`;
    if (seen.has(card.rung)) {
      warnings.push(`${where}: rung appears twice — the later one wins.`);
    }
    seen.add(card.rung);
    if (/[*_`#]|\[.+\]\(.+\)/.test(card.front)) {
      warnings.push(`${where}: the front should be plain text, no markdown.`);
    }
    const bullets = card.back
      .split(/\r?\n/)
      .filter((l) => /^\s*([-*+]|\d+\.)\s+/.test(l)).length;
    if (bullets > 5) {
      warnings.push(`${where}: ${bullets} bullets on the back — 5 is the limit; split the concept.`);
    }
    if (bullets === 0 && card.back.replace(/\s+/g, " ").length > 320) {
      warnings.push(`${where}: the back is a wall of text — use 3-5 bullets.`);
    }
  }
  const missing = [];
  for (let r = 1; r <= MAX_RUNG; r++) if (!seen.has(r)) missing.push(r);
  if (missing.length && missing.length < MAX_RUNG) {
    warnings.push(
      `${ladder.conceptId}: no card for rung ${missing.join(", ")} (${missing
        .map((r) => RUNG_NAMES[r])
        .join(", ")}).`,
    );
  }
}

/** Parse one or more concept files. Pure, so the import preview and the server
 * action agree on what a paste means. */
export function parseLadders(text: string): LadderParseResult {
  const lines = text.split(/\r?\n/);
  const errors: string[] = [];
  const warnings: string[] = [];
  const { blocks, preamble } = splitBlocks(lines);

  if (blocks.length === 0) {
    if (text.trim()) {
      errors.push(
        "No concept found. Each file starts with a “---” block naming a concept.",
      );
    }
    return { ladders: [], errors, warnings };
  }
  if (preamble) {
    errors.push(
      `Text before the first concept block: “${preamble.slice(0, 48)}”.`,
    );
  }

  const ladders: ParsedLadder[] = [];
  const byConcept = new Map<string, ParsedLadder>();

  for (const block of blocks) {
    const conceptId = (block.meta.get("concept") ?? "").trim();
    if (!CONCEPT_ID.test(conceptId)) {
      errors.push(
        `Line ${block.line}: “${conceptId}” is not a concept id (lowercase, dotted, e.g. kerberos.roasting).`,
      );
      continue;
    }
    if (byConcept.has(conceptId)) {
      errors.push(`${conceptId}: declared twice in this paste.`);
      continue;
    }
    const deckPath = (block.meta.get("deck") ?? "")
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);
    const ladder: ParsedLadder = {
      conceptId,
      deckPath,
      cards: parseBlockCards(
        conceptId,
        lines.slice(block.start, block.end),
        block.start,
        errors,
      ),
    };
    if (ladder.cards.length === 0) {
      errors.push(`${conceptId}: no rungs — add “## 1 :: …” headings.`);
      continue;
    }
    lintLadder(ladder, warnings);
    // Later duplicates of a rung win, matching the upsert.
    const deduped = new Map<number, LadderCard>();
    for (const card of ladder.cards) deduped.set(card.rung, card);
    ladder.cards = [...deduped.values()].sort((a, b) => a.rung - b.rung);
    byConcept.set(conceptId, ladder);
    ladders.push(ladder);
  }

  return { ladders, errors, warnings };
}
