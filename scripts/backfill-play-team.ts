/**
 * CLI wrapper for lib/jobs/refresh.ts#backfillPlayTeam. Resolves each player's
 * real 2025 team from Sleeper and overwrites players.play_team. The 0009
 * migration already applies this on deploy; run this to re-resolve on demand:
 *   npm run backfill:play-team
 */
import { backfillPlayTeam } from "../lib/jobs/refresh";

async function main() {
  const count = await backfillPlayTeam();
  console.log(`Backfilled play_team for ${count} player(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
