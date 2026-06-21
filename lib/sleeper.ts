const SLEEPER_BASE = "https://api.sleeper.app/v1";

export interface WeekStats {
  playerId: string;
  rushTd: number;
  recTd: number;
}

/**
 * Non-passing TDs for every player in one NFL week. Sleeper returns a flat
 * map of player_id -> stat object; we only ever need rush_td/rec_td.
 */
export async function fetchWeekStats(season: number, week: number): Promise<WeekStats[]> {
  const res = await fetch(`${SLEEPER_BASE}/stats/nfl/regular/${season}/${week}`);
  if (!res.ok) {
    throw new Error(`Sleeper stats request failed for ${season} week ${week}: ${res.status}`);
  }
  const raw: Record<string, { rush_td?: number; rec_td?: number }> = await res.json();

  return Object.entries(raw).map(([playerId, stats]) => ({
    playerId,
    rushTd: stats.rush_td ?? 0,
    recTd: stats.rec_td ?? 0,
  }));
}
