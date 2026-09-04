import { NextResponse } from "next/server";
import { ingestSeason, computeLeaderboard, refreshRoster, type RosterRefresh } from "@/lib/jobs/refresh";
import { currentSeason } from "@/lib/season";
import { sendCronFailureAlert } from "@/lib/email";

export const maxDuration = 60;

/**
 * Vercel Cron target (see vercel.json). Re-ingests the full season every run
 * rather than tracking "current week" state — Sleeper's stats endpoint is
 * cheap and idempotent (onConflictDoUpdate), so this stays simple and never
 * drifts if a week's stats get corrected after the fact.
 *
 * Vercel's Hobby plan only allows daily cron schedules, so this runs once a
 * day (vercel.json). Session 4 adds an admin "refresh now" button that hits
 * this same route on demand for same-day freshness during game weeks.
 *
 * Also refreshes the player pool (signings, trades, cutdowns) each run — see
 * refreshRoster. That step is deliberately non-fatal: the scoreboard is the
 * critical path, so a Sleeper roster hiccup logs and alerts but still lets the
 * stats ingest and leaderboard compute run.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const season = currentSeason();

  let roster: RosterRefresh | null = null;
  try {
    roster = await refreshRoster();
    console.log(
      `Roster refresh: ${roster.rostered} rostered, ${roster.added} added, ${roster.deactivated} deactivated`,
    );
  } catch (err) {
    console.error("Roster refresh failed (continuing to stats)", err);
    await sendCronFailureAlert(err);
  }

  try {
    await ingestSeason(season);
    const entrantCount = await computeLeaderboard(season);
    return NextResponse.json({ ok: true, season, entrantCount, roster });
  } catch (err) {
    console.error("Stats refresh cron failed", err);
    await sendCronFailureAlert(err);
    return NextResponse.json({ error: "Stats refresh failed" }, { status: 500 });
  }
}
