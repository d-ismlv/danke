/**
 * Every page here is dynamic, so a navigation would otherwise sit on the old
 * screen with nothing to say it had been heard. Shapes rather than a spinner:
 * they hold the space the panels are about to take.
 */
export default function Loading() {
  return (
    <div className="skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <i className="skeleton__head" />
      <i className="skeleton__list" />
    </div>
  );
}
