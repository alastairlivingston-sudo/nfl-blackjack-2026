import { NextResponse } from "next/server";

/**
 * Reports the server's current build ID (see next.config.ts). Always reflects
 * the deployed build, regardless of what any given tab has loaded — polled by
 * StaleBuildBanner to detect a stale tab after a deploy.
 */
export async function GET() {
  return NextResponse.json({ buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? null });
}
