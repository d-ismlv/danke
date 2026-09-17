/**
 * The import format, and the only definition of it.
 *
 * Pure and dependency-free so the live preview in the browser and the server
 * action that writes the rows agree, exactly, on what a paste means. Nothing
 * is imported while `issues` is non-empty.
 */

export const MIN_POINTS = 2;
export const MAX_POINTS = 6;

export type ParsedCard = { title: string; points: string[] };

/** `line` is 1-based, or null when the problem is the paste as a whole. */
export type Issue = { line: number | null; message: string };

export type ParseResult = { cards: ParsedCard[]; issues: Issue[] };

/** Shown on the import screen, and copyable, so the format is never something
 * you have to remember or reverse-engineer from an error. */
export const TEMPLATE = `# What is **deconfliction** during an offensive exercise?

- A controlled process for **separating exercise activity from real malicious activity**
- It gives incident responders authoritative context without dismissing evidence
- It protects production response and exercise credibility
- It remains active from preparation through cleanup

# Which ticket does \`mimikatz\` forge for a **Golden Ticket**?

- A **TGT** signed with the \`krbtgt\` account hash
- Any service ticket can then be requested from it normally
`;

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^[-*+]\s+(.*)$/;
/** A wrapped point: indented, and not itself a bullet or a heading. */
const CONTINUATION = /^\s{2,}(\S.*)$/;

export function parseCards(text: string): ParseResult {
  const issues: Issue[] = [];
  const cards: ParsedCard[] = [];
  const titles = new Map<string, number>();

  let current: { title: string; points: string[]; line: number } | null = null;
  /* A heading that was rejected still owns the points under it. Without this
     one bad "## Heading" reports itself and then reports every point beneath
     it as an orphan, which buries the mistake that caused them. */
  let discarding = false;

  const finish = () => {
    if (!current) return;
    const { title, points, line } = current;
    if (points.length < MIN_POINTS) {
      issues.push({
        line,
        message: `“${short(title)}” has ${count(points.length, "point")} — a card needs at least ${MIN_POINTS}.`,
      });
    } else if (points.length > MAX_POINTS) {
      issues.push({
        line,
        message: `“${short(title)}” has ${points.length} points — ${MAX_POINTS} is the limit. Split it into two cards.`,
      });
    }
    cards.push({ title, points });
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
      current = { title, points: [], line };
      checkTicks(title, line, issues);
      return;
    }

    const bullet = BULLET.exec(raw);
    if (bullet) {
      if (discarding) return;
      if (!current) {
        issues.push({
          line,
          message: `This point comes before any card. Start the card with “# your question”.`,
        });
        return;
      }
      const point = bullet[1].trim();
      if (!point) {
        issues.push({ line, message: "This point is empty." });
        return;
      }
      current.points.push(point);
      checkTicks(point, line, issues);
      return;
    }

    // A point that wrapped onto the next line rejoins the one above it, so a
    // paste out of an editor with a hard wrap is not a paste full of errors.
    const wrapped = CONTINUATION.exec(raw);
    if (wrapped && current && current.points.length > 0) {
      current.points[current.points.length - 1] += ` ${wrapped[1].trim()}`;
      return;
    }

    if (discarding) return;
    issues.push({
      line,
      message: current
        ? `“${short(raw.trim())}” is neither a question nor a point. Points start with “- ”.`
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

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}
