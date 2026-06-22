import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Header, Footer } from "@/design";
import { AuthNav } from "./AuthNav";
import { MobileNav } from "./MobileNav";

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

function NavLinks({ stacked }: { stacked?: boolean }) {
  const linkClass = stacked
    ? "rounded-lg px-2 py-2 text-sm font-medium text-violet-200 hover:bg-white/10 hover:text-white"
    : "text-sm font-medium text-violet-200 hover:text-white";
  return (
    <>
      <Link href="/scoreboard" className={linkClass}>
        Scoreboard
      </Link>
      <Link href="/teams" className={linkClass}>
        Teams
      </Link>
      <Link href="/play" className={linkClass}>
        21 Generator
      </Link>
      <Suspense
        fallback={
          <Link href="/login" className={linkClass}>
            Sign in
          </Link>
        }
      >
        <AuthNav className={linkClass} />
      </Suspense>
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-background text-foreground antialiased">
        <Header
          right={
            <>
              <nav className="hidden items-center gap-4 md:flex">
                <NavLinks />
              </nav>
              <MobileNav>
                <NavLinks stacked />
              </MobileNav>
            </>
          }
        />
        <main className="flex-1">{children}</main>
        <Footer justGivingUrl={process.env.JUSTGIVING_URL} />
      </body>
    </html>
  );
}
