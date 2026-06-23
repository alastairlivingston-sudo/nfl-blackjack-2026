/**
 * CLI wrapper for lib/jobs/refresh.ts#backfillPlayTeam.
 * Run once: npm run backfill:play-team
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
