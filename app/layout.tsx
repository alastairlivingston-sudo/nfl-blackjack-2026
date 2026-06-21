import type { Metadata } from "next";
import Link from "next/link";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Header, Footer } from "@/design";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NFL Blackjack 2026",
  description:
    "Pick 5 NFL players. Chase 21 non-passing touchdowns across the 2026 season. Don't bust.",
};

// TODO(session-5): move to env / config alongside the real charity page.
const JUST_GIVING_URL = undefined;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-background text-foreground antialiased">
        <Header
          right={
            <nav className="flex items-center gap-4">
              <Link
                href="/scoreboard"
                className="text-sm font-medium text-violet-200 hover:text-white"
              >
                Scoreboard
              </Link>
              <Link
                href="/teams"
                className="text-sm font-medium text-violet-200 hover:text-white"
              >
                Teams
              </Link>
            </nav>
          }
        />
        <main className="flex-1">{children}</main>
        <Footer justGivingUrl={JUST_GIVING_URL} />
      </body>
    </html>
  );
}
