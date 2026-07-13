/** A friendly pair of study cards with a small recall spark. */
export default function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect
        x="3.5"
        y="5"
        width="19"
        height="23"
        rx="6"
        fill="var(--accent)"
        opacity="0.22"
        transform="rotate(-8 13 16.5)"
      />
      <rect x="8" y="3" width="21" height="25" rx="7" fill="var(--accent)" />
      <path
        d="M18.5 8.5c.45 3.15 1.85 4.55 5 5-3.15.45-4.55 1.85-5 5-.45-3.15-1.85-4.55-5-5 3.15-.45 4.55-1.85 5-5Z"
        fill="white"
      />
      <circle cx="14.5" cy="22.5" r="1.5" fill="white" opacity="0.75" />
    </svg>
  );
}
