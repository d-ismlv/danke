"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";

/**
 * Two destinations, because there are two places that are not content:
 * where cards come from, and how you are doing. Everything else is reached by
 * going down through the library from the logo, which is why there is no
 * "Decks" item here — the logo is that item.
 */
const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/import", label: "Import", icon: "import" },
  { href: "/progress", label: "Progress", icon: "progress" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center gap-0.5">
      {ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.label}
            className={`flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors sm:h-9 ${
              active ? "bg-surface-2 text-text" : "text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            <Icon name={item.icon} size={17} />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
