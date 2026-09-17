import Link from "next/link";
import Icon from "./Icon";

/** The way back up, in the one place every screen puts it. */
export default function Crumb({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1 py-0.5 text-sm text-muted transition-colors hover:text-text"
    >
      <Icon name="back" size={15} />
      {children}
    </Link>
  );
}
