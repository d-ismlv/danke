/**
 * A scheduling interval as a grade key shows it: 10m, 3h, 4d, 2mo, 1.5y.
 *
 * Rounded to the one unit a person reads at a glance — the key is there to say
 * roughly how long a grade puts the card away, not to the minute.
 */
export function formatInterval(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days}d`;
  const months = Math.round(days / 30.44);
  if (months < 12) return `${months}mo`;
  const years = days / 365.25;
  return `${years < 10 ? years.toFixed(1).replace(/\.0$/, "") : Math.round(years)}y`;
}
