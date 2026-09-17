import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import "./globals.css";
import { isAuthed } from "@/lib/auth";
import Logo from "@/components/Logo";
import Nav from "@/components/Nav";
import { asTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

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
  // The bottom bar pads itself with env(safe-area-inset-*), which stays zero
  // unless the page opts into the whole screen.
  viewportFit: "cover" as const,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#121214" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [authed, theme] = await Promise.all([isAuthed(), savedTheme()]);

  return (
    // suppressHydrationWarning: dark-mode browser extensions mutate <html>
    // before React hydrates, which is harmless here.
    <html lang="en" suppressHydrationWarning data-theme={theme === "system" ? undefined : theme}>
      <body>
        {authed ? (
          <div className="application">
            <aside className="side-nav">
              <Link href="/" className="side-nav__brand" aria-label="danke — library">
                <Logo />
              </Link>
              <Nav theme={theme} />
            </aside>

            <header className="topbar">
              <Link href="/" className="wordmark">
                danke
              </Link>
            </header>

            <main className="content" id="main-content">
              {children}
            </main>
          </div>
        ) : (
          <div className="plain-shell">{children}</div>
        )}
      </body>
    </html>
  );
}
