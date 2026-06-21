import { NextResponse } from "next/server";
import { ingestSeason, computeLeaderboard } from "@/lib/jobs/refresh";

export const maxDuration = 60;

/**
 * Vercel Cron target (see vercel.json). Re-ingests the full season every run
 * rather than tracking "current week" state — Sleeper's stats endpoint is
 * cheap and idempotent (onConflictDoUpdate), so this stays simple and never
 * drifts if a week's stats get corrected after the fact.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const season = Number(process.env.NFL_SEASON ?? new Date().getFullYear());
  await ingestSeason(season);
  const entrantCount = await computeLeaderboard();

  return NextResponse.json({ ok: true, season, entrantCount });
}
