"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon, { type IconName } from "./Icon";
import ThemeToggle from "./ThemeToggle";
import { logout } from "@/lib/actions";
import type { Theme } from "@/lib/theme";

/**
 * The top bar's navigation, and the tab bar it becomes when the window is
 * narrow: the three places the application navigates between, always the same
 * three, in the same order.
 *
 * A deck is not one of them, and neither is a topic or a card: those are
 * states you reach by going down through the library, and they carry their own
 * way back up. The streak and the two controls that belong to no page — Theme
 * and Lock — stay at the right of the top bar at every width, small and
 * quiet, rather than taking a tab of their own.
 */
export default function Nav({ theme, streak }: { theme: Theme; streak: number }) {
  const pathname = usePathname();
  useFreshAfterStudy(pathname);

  return (
    <>
      <nav className="nav" aria-label="Main">
        <Item
          href="/"
          icon="library"
          label="Library"
          current={
            pathname === "/" ||
            pathname.startsWith("/decks/") ||
            pathname.startsWith("/topics/") ||
            pathname === "/study"
          }
        />
        <Item href="/progress" icon="chart" label="Progress" current={pathname.startsWith("/progress")} />
        <Item href="/import" icon="import" label="Import" current={pathname.startsWith("/import")} />
      </nav>
      <div className="nav__tools">
        <Streak days={streak} />
        <ThemeToggle initial={theme} />
        <form action={logout} className="nav__form">
          <button type="submit" className="nav__tool" aria-label="Lock danke" title="Lock">
            <Icon name="lock" />
          </button>
        </form>
      </div>
    </>
  );
}

/**
 * The bar is part of the layout, and a layout is not rendered again when you
 * move between the pages under it — so the streak it shows would still be the
 * one from before a session until the next full load. Leaving a session, by
 * any route, asks the server for this screen again, bar included.
 */
function useFreshAfterStudy(pathname: string) {
  const router = useRouter();
  const studying = useRef(false);
  useEffect(() => {
    const now = pathname === "/study" || pathname.endsWith("/study");
    if (studying.current && !now) router.refresh();
    studying.current = now;
  }, [pathname, router]);
}

/** Days in a row with at least one answer. Quiet: a fact, not a prize. */
function Streak({ days }: { days: number }) {
  const label = `${days}-day streak`;
  return (
    <span className="streak" aria-label={label} title={label}>
      <Icon name="flame" />
      <span>
        <strong>{days}</strong> {days === 1 ? "day" : "days"}
      </span>
    </span>
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
    <Link href={href} className="nav__item" aria-current={current ? "page" : undefined}>
      <Icon name={icon} />
      <span>{label}</span>
    </Link>
  );
}
