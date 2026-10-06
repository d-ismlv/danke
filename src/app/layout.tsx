import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { isAuthed } from "@/lib/auth";
import { getStreak, now } from "@/lib/queries";
import Logo from "@/components/Logo";
import Nav, { Streak } from "@/components/Nav";
import CopyFilter from "@/components/CopyFilter";
import { asTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

/* Downloaded at build time and served from the app itself: nothing is fetched
   from a font host while it runs. */
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

/** The saved theme, read on the server so `data-theme` is already on <html> in
 * the HTML we send. That is what keeps a forced light/dark choice from flashing
 * the OS theme on load. "system" is the absence of the attribute, so the CSS
 * falls through to prefers-color-scheme. */
async function savedTheme(): Promise<Theme> {
  return asTheme((await cookies()).get(THEME_COOKIE)?.value);
}

export const metadata: Metadata = {
  title: { default: "danke", template: "danke — %s" },
  description: "A self-hosted study app for cards you write yourself.",
  appleWebApp: { capable: true, title: "danke", statusBarStyle: "default" },
};

export const viewport = {
  // The tab bar pads itself with env(safe-area-inset-*), which stays zero
  // unless the page opts into the whole screen.
  viewportFit: "cover" as const,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#211f1c" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [authed, theme] = await Promise.all([isAuthed(), savedTheme()]);
  const streak = authed ? await getStreak(now()) : 0;

  return (
    // suppressHydrationWarning: dark-mode browser extensions mutate <html>
    // before React hydrates, which is harmless here.
    <html
      lang="en"
      suppressHydrationWarning
      data-theme={theme === "system" ? undefined : theme}
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <body>
        {authed ? (
          <div className="app">
            <header className="topbar">
              <div className="wrap topbar__inner">
                <Link href="/" className="brand" aria-label="danke — library">
                  <Logo />
                  <span>danke</span>
                </Link>
                <Nav theme={theme} streak={streak} />
                {/* On a narrow window the tab bar holds the navigation, and the
                    streak moves up here beside the name. */}
                <Streak days={streak} className="topbar__streak" />
              </div>
            </header>

            <main className="wrap main" id="main-content">
              {children}
            </main>

            <CopyFilter />
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
