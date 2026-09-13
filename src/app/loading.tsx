/**
 * Every page here is dynamic and several of them run a handful of queries, so
 * a navigation used to sit on the old screen with nothing to say it had been
 * heard. This is deliberately a shape rather than a spinner: it holds the
 * space the content is about to take, so nothing jumps when it arrives.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="flex flex-col gap-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-8 w-56" />
      </div>
      <div className="panel flex flex-wrap gap-8 px-4 py-5 sm:px-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="skeleton size-5 rounded-md" />
            <div className="flex flex-col gap-1.5">
              <div className="skeleton h-5 w-14" />
              <div className="skeleton h-2.5 w-20" />
            </div>
          </div>
        ))}
      </div>
      <div className="panel flex flex-col gap-3 p-4 sm:p-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
