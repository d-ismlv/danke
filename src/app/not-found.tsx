import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="anim-rise mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
      <h1 className="h-page">Nothing lives here</h1>
      <p className="text-muted text-pretty">
        The deck, topic or card you asked for has been deleted, or never existed.
      </p>
      <Link href="/" className="btn-primary mt-1">
        Your decks
      </Link>
    </div>
  );
}
