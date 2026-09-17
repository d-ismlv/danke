/**
 * Every page here is dynamic, so a navigation used to sit on the old screen
 * with nothing to say it had been heard. A shape rather than a spinner: it
 * holds the space the content is about to take, so nothing jumps on arrival.
 */
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
        <div className="panel h-44 bg-surface-2/60" />
        <div className="panel h-44 bg-surface-2/60" />
        <div className="panel h-44 bg-surface-2/60" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="panel h-32 bg-surface-2/60" />
        ))}
      </div>
    </div>
  );
}
