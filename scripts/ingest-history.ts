/**
 * Backfills completed seasons for the multi-year 21 Generator (imports scorers,
 * ingests their non-passing TDs, resolves per-season teams). Additive and
 * idempotent — safe to re-run; never touches the live 2026 game.
 *
 *   npm run history:ingest -- --season=2021          (one season)
 *   npm run history:ingest -- --from=2016 --to=2024  (inclusive range)
 *   npm run history:ingest                            (default: 2016..2024)
 *
 * 2025 already ships as the generator's PLAY_SEASON, so the default range stops
 * at 2024. Each season is a few dozen Sleeper requests; expect a few minutes.
 */
import { ingestHistoricalSeason } from "../lib/jobs/refresh";
import { PLAY_SEASON, PLAY_SEASON_MIN } from "../lib/season";

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const one = parseArg("season");
  const from = Number(parseArg("from") ?? PLAY_SEASON_MIN);
  const to = Number(parseArg("to") ?? PLAY_SEASON - 1);
  const seasons = one ? [Number(one)] : range(from, to);

  for (const season of seasons) {
    console.log(`Ingesting ${season}…`);
    const { players, teams } = await ingestHistoricalSeason(season);
    console.log(`  ${season}: ${players} scorers imported, ${teams} season-teams resolved.`);
  }
  console.log("Done.");
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
