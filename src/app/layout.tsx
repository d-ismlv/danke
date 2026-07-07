import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import "katex/dist/katex.min.css";
import { isAuthed } from "@/lib/auth";
import { logout } from "@/lib/actions";
import Logo from "@/components/Logo";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "danke — spaced repetition",
  description: "A markdown-first, self-hosted flashcard app.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authed = await isAuthed();

  return (
    // suppressHydrationWarning: dark-mode browser extensions (e.g. DarkReader)
    // mutate <html> attributes before React hydrates, which is harmless here.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Logo />
              danke
            </Link>
            {authed && (
              <nav className="flex items-center gap-1 text-sm">
                <Link
                  href="/"
                  className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
                >
                  Decks
                </Link>
                <Link
                  href="/stats"
                  className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
                >
                  Stats
                </Link>
                <form action={logout}>
                  <button className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-foreground">
                    Lock
                  </button>
                </form>
              </nav>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
