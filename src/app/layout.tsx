import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { isAuthed } from "@/lib/auth";
import { logout } from "@/lib/actions";
import Logo from "@/components/Logo";
import Nav from "@/components/Nav";
import Icon from "@/components/Icon";
import ThemeToggle from "@/components/ThemeToggle";
import { asTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

/** The saved theme, read on the server so `data-theme` is already on <html> in
 * the HTML we send. That is what keeps a forced light/dark choice from flashing
 * the OS theme on load. "system" is the absence of the attribute, so the CSS
 * falls through to prefers-color-scheme. */
async function savedTheme(): Promise<Theme> {
  return asTheme((await cookies()).get(THEME_COOKIE)?.value);
}

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "danke", template: "danke · %s" },
  description: "A self-hosted study app for cards you write yourself.",
  appleWebApp: { capable: true, title: "danke", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f14" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthed();
  const theme = await savedTheme();

  return (
    // suppressHydrationWarning: dark-mode browser extensions mutate <html>
    // before React hydrates, which is harmless here.
    <html
      lang="en"
      suppressHydrationWarning
      data-theme={theme === "system" ? undefined : theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <header className="sticky top-0 z-20 border-b bg-bg/85 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[var(--page-width)] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-md py-1 transition-opacity hover:opacity-75"
            >
              <Logo className="size-[1.6rem]" />
              <span className="text-[1.02rem] font-semibold tracking-[-0.03em]">danke</span>
            </Link>
            <div className="flex items-center gap-1">
              {authed && <Nav />}
              <ThemeToggle initial={theme} />
              {authed && (
                <form action={logout}>
                  <button
                    className="btn-ghost size-10 px-0 sm:size-9"
                    title="Lock danke"
                    aria-label="Lock danke"
                  >
                    <Icon name="lock" size={17} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </header>
        <main className="anim-fade mx-auto w-full max-w-[var(--page-width)] flex-1 px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
