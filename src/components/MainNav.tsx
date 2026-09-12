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
    <nav className="flex items-center gap-1 text-sm sm:gap-0.5" aria-label="Main navigation">
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
            title={item.label}
            /* Mobile: a comfortable square tap target, icon only. From `sm` up
               the label appears and the pill relaxes to its text width. */
            className={`transition-state flex size-12 items-center justify-center gap-1.5 rounded-lg font-medium sm:size-auto sm:min-h-9 sm:justify-start sm:rounded-md sm:px-3 ${
              active
                ? "bg-surface-2 text-foreground"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <Icon name={item.icon} size={19} className="sm:hidden" />
            <Icon name={item.icon} size={16} className="hidden sm:block" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
