import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { backfillPlayTeam } from "@/lib/jobs/refresh";

export const maxDuration = 60;

/**
 * Repoints players.play_team to each player's real 2025 team (resolved from
 * Sleeper's weekly stats) so the 21 Generator stops relabelling traded/signed
 * players under their current, re-imported roster. The 0009 migration applies
 * this on deploy; this route re-runs the same resolution on demand (e.g. after
 * a stats correction). Admin-session-gated; overwrites every resolved row, so
 * re-running is safe and deterministic.
 */
export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await backfillPlayTeam();
  return NextResponse.json({ ok: true, backfilled: count });
}
