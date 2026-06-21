/**
 * Read-only queries for the public scoreboard and player/team detail pages
 * (Session 3). The scoreboard always reads the precomputed `leaderboard`
 * table — never raw picks/stats — so it stays cheap under concurrent load
 * (see PLAN.md "Scalability for ~1,000 users").
 */
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { entrants, leaderboard, picks, players, playerWeekStats } from "./schema";

export interface ScoreboardRow {
  entrantId: string;
  displayName: string;
  totalTd: number;
  state: string;
  valid: boolean;
  rank: number | null;
  submittedAt: Date | null;
}

/** Precomputed standings, best rank first then unranked entrants by total. */
export async function getScoreboard(): Promise<ScoreboardRow[]> {
  const rows = await db()
    .select({
      entrantId: leaderboard.entrantId,
      displayName: entrants.displayName,
      totalTd: leaderboard.totalTd,
      state: leaderboard.state,
      valid: leaderboard.valid,
      rank: leaderboard.rank,
      submittedAt: entrants.submittedAt,
    })
    .from(leaderboard)
    .innerJoin(entrants, eq(entrants.id, leaderboard.entrantId))
    // Postgres puts NULLs last on ASC by default, so unranked entrants sort
    // after ranked ones automatically; ties within that fall back to total.
    .orderBy(asc(leaderboard.rank), desc(leaderboard.totalTd));

  return rows;
}

/** Single scoreboard row, for the per-entrant reveal page. */
export async function getScoreboardRow(entrantId: string): Promise<ScoreboardRow | null> {
  const [row] = await db()
    .select({
      entrantId: leaderboard.entrantId,
      displayName: entrants.displayName,
      totalTd: leaderboard.totalTd,
      state: leaderboard.state,
      valid: leaderboard.valid,
      rank: leaderboard.rank,
      submittedAt: entrants.submittedAt,
    })
    .from(leaderboard)
    .innerJoin(entrants, eq(entrants.id, leaderboard.entrantId))
    .where(eq(leaderboard.entrantId, entrantId));
  return row ?? null;
}

export interface LineupPlayer {
  playerId: string;
  fullName: string;
  team: string | null;
  position: string;
  nonPassingTd: number;
  slot: number;
}

/** A revealed entrant's 5 picks with each player's season-to-date TD total. */
export async function getLineup(entrantId: string): Promise<LineupPlayer[]> {
  const totals = await seasonTotalsByPlayer();

  const rows = await db()
    .select({
      playerId: picks.playerId,
      slot: picks.slot,
      fullName: players.fullName,
      team: players.team,
      position: players.position,
    })
    .from(picks)
    .innerJoin(players, eq(players.id, picks.playerId))
    .where(eq(picks.entrantId, entrantId))
    .orderBy(asc(picks.slot));

  return rows.map((r) => ({ ...r, nonPassingTd: totals.get(r.playerId) ?? 0 }));
}

export interface PlayerDetail {
  id: string;
  fullName: string;
  team: string | null;
  position: string;
  seasonTotal: number;
  weeks: { week: number; rushTd: number; recTd: number }[];
}

export async function getPlayer(playerId: string): Promise<PlayerDetail | null> {
  const [player] = await db().select().from(players).where(eq(players.id, playerId));
  if (!player) return null;

  const weekRows = await db()
    .select({
      week: playerWeekStats.week,
      rushTd: playerWeekStats.rushTd,
      recTd: playerWeekStats.recTd,
    })
    .from(playerWeekStats)
    .where(eq(playerWeekStats.playerId, playerId))
    .orderBy(asc(playerWeekStats.week));

  const seasonTotal = weekRows.reduce((sum, w) => sum + w.rushTd + w.recTd, 0);

  return { ...player, seasonTotal, weeks: weekRows };
}

export interface PlayerPicker {
  entrantId: string;
  displayName: string;
}

/** Entrants who picked this player. Caller is responsible for respecting lock/reveal. */
export async function getPlayerPickers(playerId: string): Promise<PlayerPicker[]> {
  return db()
    .select({ entrantId: entrants.id, displayName: entrants.displayName })
    .from(picks)
    .innerJoin(entrants, eq(entrants.id, picks.entrantId))
    .where(eq(picks.playerId, playerId));
}

export interface TeamPlayer {
  id: string;
  fullName: string;
  position: string;
  seasonTotal: number;
}

export async function getTeamPlayers(team: string): Promise<TeamPlayer[]> {
  const totals = await seasonTotalsByPlayer();

  const rows = await db()
    .select({ id: players.id, fullName: players.fullName, position: players.position })
    .from(players)
    .where(eq(players.team, team))
    .orderBy(asc(players.fullName));

  return rows
    .map((r) => ({ ...r, seasonTotal: totals.get(r.id) ?? 0 }))
    .sort((a, b) => b.seasonTotal - a.seasonTotal);
}

/** Distinct teams that have at least one eligible player, alphabetical. */
export async function listTeams(): Promise<string[]> {
  const rows = await db()
    .selectDistinct({ team: players.team })
    .from(players)
    .where(sql`${players.team} is not null`)
    .orderBy(asc(players.team));
  return rows.map((r) => r.team!).filter(Boolean);
}

async function seasonTotalsByPlayer(): Promise<Map<string, number>> {
  const rows = await db()
    .select({
      playerId: playerWeekStats.playerId,
      total: sql<number>`sum(${playerWeekStats.rushTd} + ${playerWeekStats.recTd})`,
    })
    .from(playerWeekStats)
    .groupBy(playerWeekStats.playerId);
  return new Map(rows.map((r) => [r.playerId, Number(r.total)]));
}
