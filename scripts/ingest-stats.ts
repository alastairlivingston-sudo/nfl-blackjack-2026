/**
 * CLI wrapper for lib/jobs/refresh.ts#ingestSeason / ingestWeek.
 * npm run stats:ingest -- --season=2026 --week=3
 * npm run stats:ingest -- --season=2026   (ingests weeks 1..18)
 */
import { ingestWeek, ingestSeason } from "../lib/jobs/refresh";

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const season = Number(parseArg("season") ?? new Date().getFullYear());
  const weekArg = parseArg("week");

  if (weekArg) {
    const count = await ingestWeek(season, Number(weekArg));
    console.log(`Season ${season} week ${weekArg}: upserted ${count} player-weeks.`);
  } else {
    await ingestSeason(season);
    console.log(`Season ${season}: ingested weeks 1-18.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
