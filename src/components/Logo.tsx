/** The danke brand mark — a brain on an emerald rounded square. Matches
 * app/icon.svg (the favicon). */
export default function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#10b981" />
      <path
        d="M16 6.6 C 12.6 5.2 8.7 6.2 7.7 9.1 C 5.7 9.7 5.2 12.1 6.5 13.6 C 5.4 15.1 6 17.5 7.7 18.2 C 8 20.5 10.2 21.9 12.4 21.2 C 13.2 22.9 15 22.9 16 21.9 C 17 22.9 18.8 22.9 19.6 21.2 C 21.8 21.9 24 20.5 24.3 18.2 C 26 17.5 26.6 15.1 25.5 13.6 C 26.8 12.1 26.3 9.7 24.3 9.1 C 23.3 6.2 19.4 5.2 16 6.6 Z"
        fill="#ffffff"
      />
      <g
        fill="none"
        stroke="#10b981"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 6.9 C 15 9.5 17 11.5 16 14 C 15 16.5 17 19 16 21.6" />
        <path d="M11.6 10.6 C 12.9 11.1 13.1 12.5 12.3 13.3" />
        <path d="M20.4 10.6 C 19.1 11.1 18.9 12.5 19.7 13.3" />
        <path d="M10.6 15.6 C 11.9 16.1 12.1 17.3 11.4 18.1" />
        <path d="M21.4 15.6 C 20.1 16.1 19.9 17.3 20.6 18.1" />
      </g>
    </svg>
  );
}
