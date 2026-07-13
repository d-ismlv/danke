import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import "katex/dist/katex.min.css";
import { isAuthed } from "@/lib/auth";
import { logout } from "@/lib/actions";
import Logo from "@/components/Logo";
import MainNav from "@/components/MainNav";

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
        <header className="app-header sticky top-0 z-10 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 font-semibold">
              <Logo className="size-8" />
              <span className="tracking-[-0.02em]">danke</span>
            </Link>
            {authed && (
              <div className="flex items-center gap-1 sm:gap-2">
                <MainNav />
                <form action={logout}>
                  <button className="button-quiet min-h-9 px-3">
                    Lock
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
