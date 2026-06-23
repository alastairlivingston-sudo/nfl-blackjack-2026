"use client";

import { useState } from "react";

/**
 * Below `lg`, the full nav (4 links + auth) doesn't fit next to the brand
 * mark and wraps onto a second line inside the fixed-height sticky header —
 * including iPad portrait (768px), which previously tripped the `md` nav.
 * This collapses it into a hamburger + dropdown panel on narrow viewports;
 * `lg:hidden` on the toggle and `hidden lg:flex` on the inline nav (in
 * layout.tsx) keep this and the always-visible nav mutually exclusive.
 */
export function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-lg text-violet-100 hover:bg-white/10"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {open ? (
        <div
          className="absolute top-full right-0 left-0 z-50 flex flex-col gap-1 border-t border-white/10 bg-violet-950/98 px-4 py-3 shadow-lg shadow-black/30"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
