"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/design";
import { isRedZoneWindow, REDZONE_REFRESH_MS } from "@/lib/redzone";

/** How often an open page re-reads the (ISR-cached) board between pulls. */
const VIEW_REFRESH_MS = 2 * 60 * 1000;
const TICK_MS = 30 * 1000;

/**
 * Keeps an open scoreboard live during Sunday RedZone: every
 * REDZONE_REFRESH_MS it asks /api/live-refresh to pull the live week from
 * Sleeper (the server throttles that to once per interval across all
 * viewers), and every couple of minutes it re-reads the page so a refresh
 * triggered by someone else shows up here too. Idle when the tab is hidden or
 * outside the window, so it costs nothing the rest of the week.
 */
export function LiveRefresh() {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    let lastPull = 0;
    let lastView = Date.now();
    let busy = false;

    async function tick() {
      const inWindow = isRedZoneWindow();
      setLive(inWindow);
      if (!inWindow || document.visibilityState !== "visible" || busy) return;

      let pulled = false;
      if (Date.now() - lastPull >= REDZONE_REFRESH_MS) {
        busy = true;
        lastPull = Date.now();
        try {
          const res = await fetch("/api/live-refresh", { method: "POST" });
          pulled = res.ok && (await res.json()).refreshed === true;
        } catch {
          // Offline or a Sleeper hiccup — the next tick tries again.
        } finally {
          busy = false;
        }
      }
      if (pulled || Date.now() - lastView >= VIEW_REFRESH_MS) {
        lastView = Date.now();
        router.refresh();
      }
    }

    tick();
    const id = setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);

  if (!live) return null;
  return (
    <Badge className="gap-1.5 text-success!">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden />
      Live · RedZone auto-refresh every 10 min
    </Badge>
  );
}
