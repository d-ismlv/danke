/**
 * Two cards and a spark: the card behind is the question, the card in front is
 * the answer, and the star is the recall.
 *
 * Straight edges on a 32-unit grid — no rotation, no curves in the mark — so it
 * stays crisp from a 16px favicon to a 4K header. At small sizes the back card
 * survives as a tab on the left rather than a second outline that fills in.
 */
export default function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient
          id="danke-mark"
          x1="9"
          y1="3"
          x2="29"
          y2="29"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0"
            style={{ stopColor: "color-mix(in srgb, var(--accent) 82%, white)" }}
          />
          <stop offset="1" style={{ stopColor: "var(--accent)" }} />
        </linearGradient>
      </defs>
      {/* The question, behind. */}
      <rect x="3" y="7" width="9" height="18" rx="2.5" fill="var(--accent)" opacity="0.4" />
      {/* The answer, in front. */}
      <rect x="9" y="3" width="20" height="26" rx="2.5" fill="url(#danke-mark)" />
      {/* Recall. */}
      <path
        d="M19 9 20.77 14.23 26 16 20.77 17.77 19 23 17.23 17.77 12 16 17.23 14.23Z"
        fill="var(--accent-on)"
      />
    </svg>
  );
}
