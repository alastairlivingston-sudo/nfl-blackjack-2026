import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshLiveWeek } from "@/lib/jobs/refresh";
import { claimJobLease } from "@/lib/db/queries";
import { currentSeason } from "@/lib/season";
import { isLocked } from "@/lib/lock";
import { isRedZoneWindow, REDZONE_REFRESH_MS } from "@/lib/redzone";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * RedZone auto-refresh, driven by viewers rather than a scheduler: Vercel's
 * Hobby plan only allows daily cron (see vercel.json), so the open scoreboard
 * (app/scoreboard/LiveRefresh.tsx) pings this every few minutes on a Sunday
 * afternoon and the first ping after each interval pulls the live week from
 * Sleeper. Everyone else's ping loses the lease and is a single cheap upsert.
 *
 * Public by design — it takes no input and does at most one bounded refresh
 * per interval however often it's hit, and only inside the RedZone window
 * after lock. Failures log but don't email: the daily cron already alerts, and
 * a Sleeper outage mid-afternoon would otherwise mail every ten minutes.
 */
// A minute's slack so a lone viewer polling every 10 minutes doesn't lose the
// lease to clock jitter and slip to 20.
const LEASE_MS = REDZONE_REFRESH_MS - 60_000;

export async function POST() {
  if (!isLocked() || !isRedZoneWindow()) {
    return NextResponse.json({ refreshed: false, reason: "outside-window" });
  }
  if (!(await claimJobLease("live-refresh", LEASE_MS))) {
    return NextResponse.json({ refreshed: false, reason: "recently-refreshed" });
  }

  try {
    const week = await refreshLiveWeek(currentSeason());
    // Route-handler revalidation applies on the next visit, which is the
    // router.refresh() the caller makes as soon as this responds.
    revalidatePath("/scoreboard");
    revalidatePath("/players");
    revalidatePath("/entrants/[id]", "page");
    revalidatePath("/players/[id]", "page");
    return NextResponse.json({ refreshed: week !== null, week });
  } catch (err) {
    console.error("RedZone live refresh failed", err);
    return NextResponse.json({ error: "Live refresh failed" }, { status: 500 });
  }
}
