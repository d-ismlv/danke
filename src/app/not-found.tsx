import Link from "next/link";
import Icon from "@/components/Icon";

export const metadata = { title: "Not found" };

/**
 * `notFound()` is called from six places — a deck id that no longer exists, a
 * card that belongs to another deck, a concept with no ladder. Without this
 * file every one of them dropped the app shell for Next's bare default page,
 * which has no nav and no way back.
 */
export default function NotFound() {
  return (
    <div className="anim-rise mx-auto flex w-full max-w-xl flex-col items-center gap-3 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-surface-2 text-muted">
        <Icon name="search" size={26} />
      </div>
      <p className="eyebrow">Not found</p>
      <h1 className="display-title text-2xl sm:text-3xl">Nothing lives here</h1>
      <p className="max-w-md text-pretty text-muted">
        The deck, card or concept you asked for has been deleted or never
        existed.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link href="/" className="button-primary">
          <Icon name="decks" size={15} />
          Your decks
        </Link>
        <Link href="/edge" className="button-secondary">
          <Icon name="ladder" size={15} />
          Edge map
        </Link>
      </div>
    </div>
  );
}
