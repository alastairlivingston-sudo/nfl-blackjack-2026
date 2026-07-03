/**
 * Server-only slot builders for the 21 Generator. Each slot is a random
 * (season, team) card — the wheel spins both. Totals are used here only to drop
 * guaranteed-zero players and sort best-first (so picking stays blind); they are
 * NEVER returned to the client.
 */
import "server-only";
import { getSeasonRosters, getFinalSeasonTotals, listPlaySeasons, type BarePlayer } from "@/lib/db/queries";

export interface PlaySlot {
  season: number;
  team: string;
  players: BarePlayer[];
}

function shuffle<T>(items: T[]): T[] {
  // Fisher–Yates: `sort(() => Math.random() - 0.5)` is biased and non-uniform.
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Teams in `season` with at least one non-passing-TD scorer, rosters sorted best-first (totals kept server-side). */
async function scorerRostersByTeam(season: number): Promise<Map<string, BarePlayer[]>> {
  const [rostersByTeam, totals] = await Promise.all([
    getSeasonRosters(season),
    getFinalSeasonTotals(season),
  ]);
  const result = new Map<string, BarePlayer[]>();
  for (const [team, roster] of rostersByTeam) {
    const scorers = roster.filter((p) => (totals.get(p.id) ?? 0) > 0);
    if (scorers.length === 0) continue;
    scorers.sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0));
    result.set(team, scorers);
  }
  return result;
}

/**
 * Five random (season, team) slots drawn across every loaded season — the
 * board. Teams are kept distinct so no player can appear twice.
 */
export async function buildRandomBoard(count = 5): Promise<PlaySlot[]> {
  const seasons = await listPlaySeasons();
  if (seasons.length === 0) return [];

  const cache = new Map<number, Map<string, BarePlayer[]>>();
  const rosters = async (s: number) => {
    let m = cache.get(s);
    if (!m) {
      m = await scorerRostersByTeam(s);
      cache.set(s, m);
    }
    return m;
  };

  const slots: PlaySlot[] = [];
  const usedTeams = new Set<string>();
  for (let attempt = 0; attempt < 300 && slots.length < count; attempt++) {
    const season = seasons[Math.floor(Math.random() * seasons.length)];
    const byTeam = await rosters(season);
    const teams = [...byTeam.keys()].filter((t) => !usedTeams.has(t));
    if (teams.length === 0) continue;
    const team = teams[Math.floor(Math.random() * teams.length)];
    usedTeams.add(team);
    slots.push({ season, team, players: byTeam.get(team)! });
  }
  return slots;
}

/** Team re-roll (year locked): a different team in the *same* season, avoiding teams already on the board. */
export async function buildTeamSlot(season: number, excludeTeams: string[]): Promise<PlaySlot | null> {
  const byTeam = await scorerRostersByTeam(season);
  const exclude = new Set(excludeTeams);
  for (const team of shuffle([...byTeam.keys()])) {
    if (!exclude.has(team)) return { season, team, players: byTeam.get(team)! };
  }
  return null;
}

/** Year re-roll (team locked): the *same* team in a random *different* season it has scorers in. */
export async function buildYearSlot(team: string, excludeSeason: number): Promise<PlaySlot | null> {
  const seasons = shuffle((await listPlaySeasons()).filter((s) => s !== excludeSeason));
  for (const season of seasons) {
    const roster = (await scorerRostersByTeam(season)).get(team);
    if (roster && roster.length > 0) return { season, team, players: roster };
  }
  return null;
}
