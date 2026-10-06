/**
 * Two cards and a spark: the card behind is the question, the card in front is
 * the answer, and the star is the recall.
 *
 * Straight edges on a 32-unit grid — no rotation, no curves in the mark — so it
 * stays crisp from a 16px favicon to a 4K header. At small sizes the back card
 * survives as a tab on the left rather than a second outline that fills in.
 */
export default function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      {/* The question, behind. */}
      <rect x="3" y="7" width="9" height="18" rx="2.5" fill="var(--accent)" opacity="0.35" />
      {/* The answer, in front. */}
      <rect x="9" y="3" width="20" height="26" rx="3" fill="var(--accent)" />
      {/* Recall. */}
      <path
        d="M19 9 20.77 14.23 26 16 20.77 17.77 19 23 17.23 17.77 12 16 17.23 14.23Z"
        fill="var(--accent-on)"
      />
    </svg>
  );
}
