"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";
import ThemeToggle from "./ThemeToggle";
import { logout } from "@/lib/actions";
import type { Theme } from "@/lib/theme";

/**
 * The rail, and the bottom bar it becomes when the window is narrow. Five
 * items, always the same five, in the same order.
 *
 * A deck is not one of them, and neither is a topic or a card: those are
 * states you reach by going down through the library, and they carry their own
 * way back up. What is here is the three places the application navigates
 * between, and the two controls that belong to no page.
 */
export default function Nav({ theme }: { theme: Theme }) {
  const pathname = usePathname();

  return (
    <nav className="side-nav__items" aria-label="Main">
      <Item
        href="/"
        icon="library"
        label="Library"
        current={pathname === "/" || pathname.startsWith("/decks/") || pathname.startsWith("/topics/") || pathname === "/study"}
      />
      <Item
        href="/progress"
        icon="chart"
        label="Progress"
        current={pathname.startsWith("/progress")}
      />
      <Item
        href="/import"
        icon="import"
        label="Import"
        current={pathname.startsWith("/import")}
      />
      <ThemeToggle initial={theme} />
      <form action={logout} className="rail-form">
        <button type="submit" className="rail-action" aria-label="Lock danke">
          <Icon name="lock" />
          <span>Lock</span>
        </button>
      </form>
    </nav>
  );
}

function Item({
  href,
  icon,
  label,
  current,
}: {
  href: string;
  icon: IconName;
  label: string;
  current: boolean;
}) {
  return (
    <Link href={href} className="side-nav__item" aria-current={current ? "page" : undefined}>
      <Icon name={icon} />
      <span>{label}</span>
    </Link>
  );
}
