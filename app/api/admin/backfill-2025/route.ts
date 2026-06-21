import { NextResponse } from "next/server";
import { ingestSeason } from "@/lib/jobs/refresh";

export const maxDuration = 60;

/**
 * One-off: production DB has never run `stats:ingest --season=2025`, so
 * /play's reveal always shows 0 non-passing TDs. CRON_SECRET-gated like the
 * stats refresh route; ingestSeason is idempotent (onConflictDoUpdate).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ingestSeason(2025);

  return NextResponse.json({ ok: true });
}
