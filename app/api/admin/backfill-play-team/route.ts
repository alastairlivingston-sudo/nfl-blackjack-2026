import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { backfillPlayTeam } from "@/lib/jobs/refresh";

export const maxDuration = 60;

/**
 * One-off: freezes players.play_team (added by migration 0005) so the 21
 * Generator stops relabelling traded players under their live, re-imported
 * team. Admin-session-gated; idempotent (only touches rows where play_team
 * is still null), so safe to leave — remove once confirmed run.
 */
export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await backfillPlayTeam();
  return NextResponse.json({ ok: true, backfilled: count });
}
