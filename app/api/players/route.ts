import { NextResponse } from "next/server";
import { listPickablePlayers } from "@/lib/db/queries";

/**
 * The entry typeahead's player pool, served from the DB so it reflects the
 * nightly roster refresh (signings, trades, cutdowns) without a redeploy —
 * `public/players.json` is a build-time snapshot and only moves when someone
 * ships, which is why late signings like a Week 1 free-agent WR went missing.
 * PlayerPicker falls back to that static file if this route is unreachable.
 *
 * Public, non-secret data (it already ships in `public/`), so no auth.
 *
 * Rendered on demand and cached at the CDN for 15 minutes via Cache-Control
 * (the pool changes at most daily). Deliberately *not* `export const revalidate`
 * — that would prerender the pool at build time, making every deploy depend on
 * the DB being reachable and baking a snapshot into the bundle, which is the
 * staleness this route exists to avoid.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const pool = await listPickablePlayers();
  return NextResponse.json(pool, {
    headers: { "cache-control": "public, s-maxage=900, stale-while-revalidate=86400" },
  });
}
