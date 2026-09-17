/**
 * Every page here is dynamic, so a navigation would otherwise sit on the old
 * screen with nothing to say it had been heard. Shapes rather than a spinner:
 * they hold the space the content is about to take.
 */
export default function Loading() {
  return (
    <div className="skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <i style={{ height: "3.5rem" }} />
      <i style={{ height: "6rem" }} />
      <i style={{ height: "14rem" }} />
    </div>
  );
}
