import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="centered-message">
      <h1>Nothing lives here</h1>
      <p>The deck, topic or card you asked for has been deleted, or never existed.</p>
      <div className="centered-message__actions">
        <Link href="/" className="primary-action">
          Library
        </Link>
      </div>
    </div>
  );
}
