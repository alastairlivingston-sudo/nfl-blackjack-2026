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

const SLEEPER_GRAPHQL = "https://sleeper.com/graphql";
// player_ids per GraphQL request — keeps the query/URL well under any limit
// while still resolving the full ~950-player pool in a handful of round trips.
const TEAM_BATCH = 200;

/**
 * Each player's primary team for a completed season, keyed by Sleeper id.
 *
 * The REST stats endpoint (`fetchWeekStats`) deliberately strips team, so the
 * 21 Generator — which must label a player by the team they actually played for
 * in 2025, not their current (re-imported, 2026-offseason) roster — has to come
 * here: Sleeper's GraphQL weekly stats carry the per-week team. For a player
 * traded mid-season we pick the team they appeared for in the *most* weeks,
 * tie-broken by the later week. This mapping is what the 0009 data migration
 * froze into `players.play_team`.
 */
export async function fetchSeasonTeams(
  season: number,
  playerIds: string[],
  weeks: number[] = Array.from({ length: 18 }, (_, i) => i + 1),
): Promise<Map<string, string>> {
  // For each player: how many weeks on each team, and the latest week seen on
  // each — enough to resolve the dominant team with a deterministic tie-break.
  const counts = new Map<string, Map<string, number>>();
  const lastWeek = new Map<string, Map<string, number>>();

  for (const week of weeks) {
    for (let i = 0; i < playerIds.length; i += TEAM_BATCH) {
      const batch = playerIds.slice(i, i + TEAM_BATCH);
      const rows = await fetchWeekTeams(season, week, batch);
      for (const { playerId, team } of rows) {
        if (!team) continue;
        const byTeam = counts.get(playerId) ?? new Map<string, number>();
        byTeam.set(team, (byTeam.get(team) ?? 0) + 1);
        counts.set(playerId, byTeam);
        const seen = lastWeek.get(playerId) ?? new Map<string, number>();
        seen.set(team, week);
        lastWeek.set(playerId, seen);
      }
    }
  }

  const resolved = new Map<string, string>();
  for (const [playerId, byTeam] of counts) {
    const max = Math.max(...byTeam.values());
    const tied = [...byTeam].filter(([, n]) => n === max).map(([t]) => t);
    const seen = lastWeek.get(playerId)!;
    resolved.set(playerId, tied.reduce((a, b) => ((seen.get(b) ?? 0) > (seen.get(a) ?? 0) ? b : a)));
  }
  return resolved;
}

async function fetchWeekTeams(
  season: number,
  week: number,
  playerIds: string[],
): Promise<{ playerId: string; team: string | null }[]> {
  const query = `query{ stats_for_players_in_week(sport:"nfl",season:"${season}",category:"stat",season_type:"regular",week:${week},player_ids:${JSON.stringify(
    playerIds,
  )}){ player_id team }}`;

  const res = await fetch(SLEEPER_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Sleeper GraphQL request failed for ${season} week ${week}: ${res.status}`);
  }
  const body: {
    data?: { stats_for_players_in_week?: { player_id: string; team: string | null }[] };
    errors?: unknown;
  } = await res.json();
  if (body.errors) {
    throw new Error(`Sleeper GraphQL error for ${season} week ${week}: ${JSON.stringify(body.errors)}`);
  }
  return (body.data?.stats_for_players_in_week ?? []).map((r) => ({
    playerId: r.player_id,
    team: r.team,
  }));
}
