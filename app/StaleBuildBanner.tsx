"use client";

import { useEffect, useState } from "react";
import { Button } from "@/design";

const POLL_INTERVAL_MS = 60_000;

/** Prompts a reload when a deploy has landed since this tab loaded its JS — see next.config.ts's buildId. */
export function StaleBuildBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { buildId } = (await res.json()) as { buildId: string | null };
        if (!cancelled && buildId && buildId !== process.env.NEXT_PUBLIC_BUILD_ID) {
          setStale(true);
        }
      } catch {
        // Network hiccup — try again on the next interval.
      }
    }

    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!stale) return null;

  return (
    <div className="flex items-center justify-center gap-3 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
      <span>A new version of the app is available.</span>
      <Button
        variant="secondary"
        size="sm"
        className="border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
        onClick={() => window.location.reload()}
      >
        Refresh
      </Button>
    </div>
  );
}
