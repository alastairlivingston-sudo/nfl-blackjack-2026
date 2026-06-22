/**
 * One-time backfill for `players.play_team` — freezes each player's team as
 * of right now into a column that future `npm run import:players` runs never
 * touch (see lib/db/schema.ts `players.playTeam`).
 *
 * Why this exists: `players.team` is overwritten on every live-season
 * re-import. The 21 Generator (PLAN.md "21 Generator") scores frozen 2025
 * stats but, until this backfill, grouped/labelled players by that same
 * mutable `team` column — so a player traded since the last import showed up
 * under their new team while scoring their old team's 2025 production.
 * Run once: npm run backfill:play-team
 */
import { isNull, sql } from "drizzle-orm";
import { db } from "../lib/db/client";
import { players } from "../lib/db/schema";

async function main() {
  const conn = db();
  const result = await conn
    .update(players)
    .set({ playTeam: sql`${players.team}` })
    .where(isNull(players.playTeam));
  console.log(`Backfilled play_team for players missing it. (rowCount: ${result.rowCount ?? "unknown"})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
