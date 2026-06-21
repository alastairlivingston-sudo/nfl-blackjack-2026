/** CLI wrapper for lib/jobs/refresh.ts#computeLeaderboard. npm run leaderboard:compute */
import { computeLeaderboard } from "../lib/jobs/refresh";

async function main() {
  const count = await computeLeaderboard();
  console.log(count === 0 ? "No fully-submitted entrants yet." : `Recomputed leaderboard for ${count} entrants.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
