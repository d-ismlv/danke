import type { ReactNode } from "react";
import type { Counts } from "@/lib/queries";

/**
 * One figure: a keyed label, the number, and a line on what it counts. The
 * number's line is held at one height, so a unit beside it cannot push the
 * captions of a row out of line with each other.
 */
export function Figure({
  dot,
  label,
  value,
  unit,
  caption,
  accent = false,
}: {
  dot: string;
  label: string;
  value: ReactNode;
  unit?: string;
  caption?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="stat__label">
        <i className={`dot dot--${dot}`} />
        {label}
      </p>
      <p className={accent ? "stat__figure stat__figure--due" : "stat__figure"}>
        {value}
        {unit && <span className="stat__unit">{unit}</span>}
      </p>
      {caption && <p className="stat__caption">{caption}</p>}
    </div>
  );
}

/**
 * The four figures under a heading — what is due, what is unseen, how much is
 * learned and how recall is going — the same four on the library and on a
 * deck. A topic swaps the third for its mature count.
 */
export function Figures({
  label,
  counts,
  dueCaption,
  third,
}: {
  label: string;
  counts: Counts;
  dueCaption: string;
  third?: ReactNode;
}) {
  return (
    <section className="stats" aria-label={label}>
      <Figure dot="due" label="Due now" value={counts.due} caption={dueCaption} accent={counts.due > 0} />
      <Figure dot="unseen" label="Unseen" value={counts.memory.unseen} caption="never answered" />
      {third ?? (
        <Figure
          dot="young"
          label="Learned"
          value={counts.percent}
          unit="%"
          caption={`${counts.learned} of ${counts.cards} graduated`}
        />
      )}
      <Figure
        dot="recall"
        label="Recall"
        value={counts.recall === null ? "—" : counts.recall}
        unit={counts.recall === null ? undefined : "%"}
        caption="last 30 days"
      />
    </section>
  );
}
