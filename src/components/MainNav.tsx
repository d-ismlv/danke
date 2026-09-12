"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Decks", icon: "decks" },
  { href: "/edge", label: "Edge", icon: "ladder" },
  { href: "/stats", label: "Stats", icon: "stats" },
];

export default function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 text-sm" aria-label="Main navigation">
      {ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/" || pathname.startsWith("/decks/")
            : pathname.startsWith(item.href) ||
              (item.href === "/edge" && pathname.startsWith("/drill/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`transition-state flex min-h-9 items-center gap-1.5 rounded-md px-2.5 font-medium sm:px-3 ${
              active
                ? "bg-surface-2 text-foreground"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <Icon name={item.icon} size={16} />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
