/**
 * Runs the same additive roster refresh the nightly cron does, against the DB
 * in DATABASE_URL — new signings and trades in, cutdowns flagged inactive,
 * nothing ever deleted. Use it to pick up a transaction without waiting for the
 * 09:00 UTC cron. Run with: npm run roster:refresh
 */
import { refreshRoster } from "../lib/jobs/refresh";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const { rostered, added, deactivated } = await refreshRoster();
  console.log(
    `Roster refreshed: ${rostered} rostered, ${added} new players added, ${deactivated} flagged inactive (rows kept).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
