import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="panel message">
      <h1>Nothing lives here</h1>
      <p>The deck, topic or card you asked for has been deleted, or never existed.</p>
      <div className="message__actions">
        <Link href="/" className="btn btn--primary">
          Library
        </Link>
      </div>
    </div>
  );
}
