/**
 * The import format, and the only definition of it.
 *
 * Pure and dependency-free so the live preview in the browser, the card editor
 * and the server action that writes the rows agree, exactly, on what a paste
 * means. Nothing is imported while `issues` is non-empty.
 */

/** A card with a question and nothing under it is a card that cannot be
 * answered, so one point is the floor. There is no ceiling: a long answer
 * scrolls inside the study card, which is what that card was built to do. */
export const MIN_POINTS = 1;

/** One line of inline markup, and whatever list hangs under it. */
export type Item = { text: string; list?: List };

/**
 * The items of one list, and whether it is numbered. A card's answer is one of
 * these, and so is a list nested under a point.
 *
 * `ordered` is decided by the first marker in the list — write `1.` and the
 * list numbers itself, write `-` and it bullets. The numbers themselves are
 * not stored: `<ol>` counts, so a list that starts `1. 1. 1.` still reads 1, 2,
 * 3, and inserting a point never means renumbering the ones below it.
 */
export type List = { ordered: boolean; items: Item[] };

export type ParsedCard = { title: string; points: List };

/** `line` is 1-based, or null when the problem is the paste as a whole. */
export type Issue = { line: number | null; message: string };

export type ParseResult = { cards: ParsedCard[]; issues: Issue[] };

/** Shown on the import screen, and copyable, so the format is never something
 * you have to remember or reverse-engineer from an error. */
export const TEMPLATE = `# What is **deconfliction** during an offensive exercise?

- A controlled process for **separating exercise activity from real malicious activity**
- It gives incident responders authoritative context without dismissing evidence
- It remains active from preparation through cleanup

# Which ticket does \`mimikatz\` forge for a **Golden Ticket**?

- A **TGT** signed with the \`krbtgt\` account hash
- Any service ticket can then be requested from it normally

# How should defenders separate malicious discovery from **administration**?

- Baseline the approved identity-management and security tools
- Compare the **source host, account, and normal operating window**
- Look for attack-path-oriented questions *rather than raw query volume*:
  - Who is privileged?
  - Who can modify whom?
  - Where is delegation configured?
- Correlate discovery with credential access or directory changes

# In what order does a **Kerberoasting** attack run?

1. Enumerate accounts that have an \`SPN\` set
2. Request a service ticket for each one
3. Crack the ticket offline against a wordlist
`;

const HEADING = /^(#{1,6})\s+(.*)$/;

/**
 * A point: any indentation, then a bullet or a number, then its text. The
 * indentation is what makes it a sub-point, so unlike the rest of the format
 * this line is read by column and not only by its marker.
 */
const POINT = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

/** A wrapped point: indented, and not itself a point or a heading. */
const CONTINUATION = /^\s+(\S.*)$/;

/** Tabs count as two columns, which is the width the import editor draws them
 * at — indentation you can see is indentation the parser agrees with. */
function indentOf(prefix: string): number {
  return prefix.replace(/\t/g, "  ").length;
}

/**
 * Collects the points of one card.
 *
 * Depth is relative, not absolute: a point is a sub-point when it is indented
 * deeper than the point above it, whatever that indentation happens to be. Two
 * spaces, four, or a tab all work, and a file that is inconsistent about it
 * still nests the way it looks like it nests. One level is as deep as it goes —
 * anything deeper joins the sub-points it sits under rather than becoming a
 * third level, because a flashcard is not an outline.
 */
function points() {
  const root: List = { ordered: false, items: [] };
  /** The top-level point a sub-point hangs from, and its indentation. */
  let parent: Item | null = null;
  let base = 0;
  /** The point a wrapped line rejoins, at whichever level it was added. */
  let last: Item | null = null;

  return {
    root,
    add(indent: number, ordered: boolean, text: string): void {
      if (parent && indent > base) {
        const list = (parent.list ??= { ordered, items: [] });
        last = { text };
        list.items.push(last);
        return;
      }
      if (root.items.length === 0) root.ordered = ordered;
      base = indent;
      last = { text };
      parent = last;
      root.items.push(last);
    },
    /** True when there was a point above to rejoin. */
    wrap(text: string): boolean {
      if (!last) return false;
      last.text += ` ${text}`;
      return true;
    },
  };
}

export function parseCards(text: string): ParseResult {
  const issues: Issue[] = [];
  const cards: ParsedCard[] = [];
  const titles = new Map<string, number>();

  let current: { title: string; points: ReturnType<typeof points>; line: number } | null = null;
  /* A heading that was rejected still owns the points under it. Without this
     one bad "## Heading" reports itself and then reports every point beneath
     it as an orphan, which buries the mistake that caused them. */
  let discarding = false;

  const finish = () => {
    if (!current) return;
    const { title, points: built, line } = current;
    const list = built.root;
    if (list.items.length < MIN_POINTS) {
      issues.push({
        line,
        message: `“${short(title)}” has no points — a card needs at least one.`,
      });
    }
    cards.push({ title, points: list });
    current = null;
  };

  const lines = text.split(/\r?\n/);

  lines.forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim()) return;

    const heading = HEADING.exec(raw);
    if (heading) {
      const [, hashes, rest] = heading;
      if (hashes.length !== 1) {
        finish();
        discarding = true;
        issues.push({
          line,
          message: `Use a single “#” to start a card. This line begins with “${hashes}”.`,
        });
        return;
      }
      finish();
      discarding = false;
      const title = rest.trim();
      if (!title) {
        discarding = true;
        issues.push({ line, message: "A card needs a question after the “#”." });
        return;
      }
      const seen = titles.get(title);
      if (seen !== undefined) {
        discarding = true;
        issues.push({
          line,
          message: `“${short(title)}” already appears on line ${seen}. Two cards in one topic cannot ask the same question.`,
        });
        return;
      }
      titles.set(title, line);
      current = { title, points: points(), line };
      checkTicks(title, line, issues);
      return;
    }

    const point = POINT.exec(raw);
    if (point) {
      if (discarding) return;
      if (!current) {
        issues.push({
          line,
          message: `This point comes before any card. Start the card with “# your question”.`,
        });
        return;
      }
      const [, prefix, marker, rest] = point;
      const body = rest.trim();
      if (!body) {
        issues.push({ line, message: "This point is empty." });
        return;
      }
      current.points.add(indentOf(prefix), marker.length > 1, body);
      checkTicks(body, line, issues);
      return;
    }

    // A point that wrapped onto the next line rejoins the one above it, so a
    // paste out of an editor with a hard wrap is not a paste full of errors.
    const wrapped = CONTINUATION.exec(raw);
    if (wrapped && current && current.points.wrap(wrapped[1].trim())) return;

    if (discarding) return;
    issues.push({
      line,
      message: current
        ? `“${short(raw.trim())}” is neither a question nor a point. Points start with “- ” or “1. ”.`
        : `“${short(raw.trim())}” comes before any card. Start the card with “# your question”.`,
    });
  });

  finish();

  if (cards.length === 0 && issues.length === 0) {
    issues.push({
      line: null,
      message: text.trim()
        ? "Nothing here looks like a card. A card is a “# question” line followed by its points."
        : "Paste your cards to see what will be imported.",
    });
  }

  // Read the problems in the order the lines appear: a card's own problem is
  // only discovered at the card after it, so they arrive out of sequence.
  issues.sort((a, b) => (a.line ?? Infinity) - (b.line ?? Infinity));

  return { cards, issues };
}

/**
 * The points of a single card, with no question above them — what the card
 * editor's box holds. The same rules as an import, so a card reads back out of
 * the editor exactly as it would out of a paste.
 */
export function parsePoints(text: string): { points: List; issues: Issue[] } {
  const issues: Issue[] = [];
  const built = points();

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim()) return;

    if (HEADING.test(raw)) {
      issues.push({ line, message: "The question goes in the field above, not here." });
      return;
    }

    const point = POINT.exec(raw);
    if (point) {
      const [, prefix, marker, rest] = point;
      const body = rest.trim();
      if (!body) {
        issues.push({ line, message: "This point is empty." });
        return;
      }
      built.add(indentOf(prefix), marker.length > 1, body);
      checkTicks(body, line, issues);
      return;
    }

    const wrapped = CONTINUATION.exec(raw);
    if (wrapped && built.wrap(wrapped[1].trim())) return;

    /* A line with no marker at all is the common case in the editor — the box
       used to be one plain point per line — so it is a point, not a mistake. */
    built.add(0, false, raw.trim());
    checkTicks(raw.trim(), line, issues);
  });

  return { points: built.root, issues };
}

/**
 * A list written back out in the format it was authored in.
 *
 * The card editor opens on this, so what you see in the box is the same
 * language the importer reads — including the markers, which the old editor
 * stripped on save and could therefore never show you again.
 */
export function formatPoints(list: List, depth = 0): string {
  const pad = "  ".repeat(depth);
  return list.items
    .map((item, i) => {
      const marker = list.ordered ? `${i + 1}.` : "-";
      const head = `${pad}${marker} ${item.text}`;
      return item.list ? `${head}\n${formatPoints(item.list, depth + 1)}` : head;
    })
    .join("\n");
}

/**
 * Whatever the `points` column holds, as a list.
 *
 * It is a JSON column, so its shape is a promise rather than a constraint —
 * and cards written before points could nest are a plain array of strings.
 * Every read goes through here, so the old shape renders as what it always
 * meant: a flat bulleted list.
 */
export function toList(value: unknown): List {
  const parsed = typeof value === "string" ? tryParse(value) : value;
  if (Array.isArray(parsed)) {
    return { ordered: false, items: parsed.map((text) => ({ text: String(text) })) };
  }
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as List).items)) {
    const list = parsed as List;
    return { ordered: Boolean(list.ordered), items: list.items.map(item) };
  }
  return { ordered: false, items: [] };
}

function item(value: Item): Item {
  const nested = value.list;
  return {
    text: String(value.text ?? ""),
    ...(nested && Array.isArray(nested.items)
      ? { list: { ordered: Boolean(nested.ordered), items: nested.items.map(item) } }
      : {}),
  };
}

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** An odd number of backticks means a code span someone forgot to close, and
 * it would import as a stray tick in the middle of a sentence. */
function checkTicks(text: string, line: number, issues: Issue[]): void {
  const ticks = (text.match(/`/g) ?? []).length;
  if (ticks % 2 === 1) {
    issues.push({ line, message: "There is an unclosed ` on this line." });
  }
}

function short(text: string): string {
  return text.length > 52 ? `${text.slice(0, 52)}…` : text;
}
