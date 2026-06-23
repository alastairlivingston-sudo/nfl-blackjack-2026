import Link from "next/link";

/** Signature sticky header: violet → indigo gradient, brand on the left. */
export function Header({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-violet-950 via-indigo-900 to-violet-950 backdrop-blur supports-[backdrop-filter]:bg-opacity-90">
      {/* Chrome, not page content: the body sits in max-w-2xl, but the brand +
          full nav need more room than that. Capping the bar at the narrower
          width is what made the links wrap onto a second line on iPad. */}
      <div className="relative mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-extrabold tracking-tight text-white"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15 text-sm font-black">
            21
          </span>
          <span className="hidden sm:inline">
            NFL Blackjack <span className="text-violet-300">2026</span>
          </span>
          {/* Beta watermark: this is still under test — keep it visible next to the brand. */}
          <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-warning">
            Beta
          </span>
        </Link>
        {right}
      </div>
    </header>
  );
}
