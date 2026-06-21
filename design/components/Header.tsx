import Link from "next/link";
import { Container } from "./Container";

/** Signature sticky header: violet → indigo gradient, brand on the left. */
export function Header({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-violet-950 via-indigo-900 to-violet-950 backdrop-blur supports-[backdrop-filter]:bg-opacity-90">
      <Container className="flex h-14 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-extrabold tracking-tight text-white"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15 text-sm font-black">
            21
          </span>
          <span>
            NFL Blackjack <span className="text-violet-300">2026</span>
          </span>
        </Link>
        {right}
      </Container>
    </header>
  );
}
