const SLEEPER_BASE = "https://api.sleeper.app/v1";

export interface WeekStats {
  playerId: string;
  rushTd: number;
  recTd: number;
  returnTd: number;
  recoveryTd: number;
}

/**
 * Non-passing TDs for every player in one NFL week. Sleeper returns a flat
 * map of player_id -> stat object. The scoring unit is rushing + receiving +
 * return + recovery: rush_td, rec_td, st_td (a skill player's kick/punt-return
 * TD is attributed to st_td; kr_td/pr_td are team-level aggregates we ignore),
 * and fum_rec_td (fumble-recovery TD).
 */
export async function fetchWeekStats(season: number, week: number): Promise<WeekStats[]> {
  // Without a timeout, a hung Sleeper request can run past the cron route's
  // own maxDuration — the platform kills the function before our catch block
  // (and its failure alert email) ever runs, so the scoreboard goes stale
  // with nobody notified.
  const res = await fetch(`${SLEEPER_BASE}/stats/nfl/regular/${season}/${week}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Sleeper stats request failed for ${season} week ${week}: ${res.status}`);
  }
  const raw: Record<
    string,
    { rush_td?: number; rec_td?: number; st_td?: number; fum_rec_td?: number }
  > = await res.json();

  return Object.entries(raw).map(([playerId, stats]) => ({
    playerId,
    rushTd: stats.rush_td ?? 0,
    recTd: stats.rec_td ?? 0,
    returnTd: stats.st_td ?? 0,
    recoveryTd: stats.fum_rec_td ?? 0,
  }));
}
