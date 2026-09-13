import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import "katex/dist/katex.min.css";
import { isAuthed } from "@/lib/auth";
import { logout } from "@/lib/actions";
import Logo from "@/components/Logo";
import MainNav from "@/components/MainNav";
import Icon from "@/components/Icon";
import ThemeToggle from "@/components/ThemeToggle";
import { asTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

/** The saved theme, read on the server so `data-theme` is already on <html>
 * in the HTML we send. This is what keeps a forced light/dark choice from
 * flashing the OS theme on load — it used to take an inline script racing the
 * first paint, which React 19 will not run anyway. "system" is the absence of
 * the attribute, so the CSS falls through to prefers-color-scheme. */
async function savedTheme(): Promise<Theme> {
  return asTheme((await cookies()).get(THEME_COOKIE)?.value);
}

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  /* Every page names only where you are; the template puts danke in front of
     it. With several tabs open on the same app, the tab strip is the only
     place that says which is the drill and which is the deck you were
     editing. */
  title: {
    default: "danke",
    template: "danke: %s",
  },
  description: "A markdown-first, self-hosted flashcard app.",
};

/* The browser paints its own chrome from this: the header colour in each
   theme, so the address bar doesn't sit on a white band above a dark app. */
export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f3f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1015" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authed = await isAuthed();
  const theme = await savedTheme();

  return (
    // suppressHydrationWarning: dark-mode browser extensions (e.g. DarkReader)
    // mutate <html> attributes before React hydrates, which is harmless here.
    <html
      lang="en"
      suppressHydrationWarning
      data-theme={theme === "system" ? undefined : theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="app-header sticky top-0 z-10 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="transition-state flex items-center gap-2.5 rounded-md px-1 py-1 font-semibold hover:opacity-80"
            >
              <Logo className="size-7" />
              <span className="text-base tracking-[-0.025em]">danke</span>
            </Link>
            <div className="flex items-center gap-1 sm:gap-2">
              {authed && <MainNav />}
              <ThemeToggle initial={theme} />
              {authed && (
                <form action={logout}>
                  <button
                    className="button-quiet size-12 justify-center p-0 sm:size-auto sm:min-h-9 sm:px-2.5"
                    title="Lock danke"
                  >
                    <Icon name="lock" size={19} className="sm:hidden" />
                    <Icon name="lock" size={16} className="hidden sm:block" />
                    <span className="hidden sm:inline">Lock</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </header>
        <main className="anim-fade mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
