import type { ReactNode } from "react";

/**
 * One figure: a label, the number, and a line on what it counts. The number's
 * line is held at one height, so a unit beside it cannot push the captions of
 * a row out of line with each other.
 *
 * Figures live on Progress and at the end of a session — the two places that
 * are about how it is going. The screens you study from lead with what is
 * waiting instead.
 */
export function Figure({
  label,
  value,
  unit,
  caption,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  caption?: string;
}) {
  return (
    <div>
      <p className="stat__label">{label}</p>
      <p className="stat__figure">
        {value}
        {unit && <span className="stat__unit">{unit}</span>}
      </p>
      {caption && <p className="stat__caption">{caption}</p>}
    </div>
  );
}
