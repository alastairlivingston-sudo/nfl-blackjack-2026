/**
 * Server-only slot builders for the multi-year 21 Generator. Totals are used
 * here purely to (a) drop guaranteed-zero players and (b) sort best-first so the
 * jeopardy is picking blind — they are NEVER returned to the client. A slot is a
 * (season, team) card plus that team's scorer roster with no totals attached.
 */
import "server-only";
import { getSeasonRosters, getFinalSeasonTotals, type BarePlayer } from "@/lib/db/queries";

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

/** Five random (season, team) slots for one season — the initial board / a year re-roll. */
export async function buildSeasonSlots(season: number, count = 5): Promise<PlaySlot[]> {
  const byTeam = await scorerRostersByTeam(season);
  const slots: PlaySlot[] = [];
  for (const team of shuffle([...byTeam.keys()])) {
    if (slots.length === count) break;
    slots.push({ season, team, players: byTeam.get(team)! });
  }
  return slots;
}

/** One fresh slot in `season` whose team isn't already on the board — a team re-roll. */
export async function buildTeamSlot(season: number, excludeTeams: string[]): Promise<PlaySlot | null> {
  const byTeam = await scorerRostersByTeam(season);
  const exclude = new Set(excludeTeams);
  for (const team of shuffle([...byTeam.keys()])) {
    if (!exclude.has(team)) return { season, team, players: byTeam.get(team)! };
  }
  return null;
}
