/**
 * Read-only queries for the public scoreboard and player/team detail pages
 * (Session 3). The scoreboard always reads the precomputed `leaderboard`
 * table — never raw picks/stats — so it stays cheap under concurrent load
 * (see PLAN.md "Scalability for ~1,000 users").
 */
import { and, asc, desc, eq, gt, gte, inArray, or, sql } from "drizzle-orm";
import { db } from "./client";
import { entrants, feedback, leaderboard, loginAttempts, picks, players, playerWeekStats, playerSeasonTeam } from "./schema";
import { currentSeason } from "../season";

export interface ScoreboardRow {
  entrantId: string;
  displayName: string;
  totalTd: number;
  state: string;
  valid: boolean;
  rank: number | null;
  submittedAt: Date | null;
}

export interface EnteredRow {
  entrantId: string;
  displayName: string;
}

/**
 * Pre-lock scoreboard source: everyone who has confirmed a lineup, straight
 * from `entrants` — NOT the `leaderboard` table. The leaderboard is only
 * written by the cron/admin recompute, so reading it pre-lock would hide a
 * user who just submitted until the next compute (up to a day). Ordered by
 * submission so the list is stable.
 */
export async function getEnteredEntrants(): Promise<EnteredRow[]> {
  const rows = await db()
    .select({ entrantId: entrants.id, displayName: entrants.displayName })
    .from(entrants)
    .where(sql`${entrants.submittedAt} is not null`)
    .orderBy(asc(entrants.submittedAt));
  return rows;
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
  weeks: { week: number; rushTd: number; recTd: number; returnTd: number; recoveryTd: number }[];
}

export async function getPlayer(playerId: string): Promise<PlayerDetail | null> {
  const [player] = await db().select().from(players).where(eq(players.id, playerId));
  if (!player) return null;

  const weekRows = await db()
    .select({
      week: playerWeekStats.week,
      rushTd: playerWeekStats.rushTd,
      recTd: playerWeekStats.recTd,
      returnTd: playerWeekStats.returnTd,
      recoveryTd: playerWeekStats.recoveryTd,
    })
    .from(playerWeekStats)
    .where(and(eq(playerWeekStats.playerId, playerId), eq(playerWeekStats.season, currentSeason())))
    .orderBy(asc(playerWeekStats.week));

  const seasonTotal = weekRows.reduce(
    (sum, w) => sum + w.rushTd + w.recTd + w.returnTd + w.recoveryTd,
    0,
  );

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

export interface BarePlayer {
  id: string;
  fullName: string;
  position: string;
}

/**
 * Players on a team with no totals attached — used by the 21 Generator picker,
 * which hides totals until reveal. Grouped by `playTeam` (frozen as of the
 * 2025 season being scored), falling back to the live `team` for players
 * never backfilled — NOT `team` directly, which gets overwritten by every
 * live-season re-import and would silently relabel a traded player's 2025
 * production under their new team (see schema.ts `players.playTeam`).
 */
export async function getTeamPlayersBare(team: string): Promise<BarePlayer[]> {
  return db()
    .select({ id: players.id, fullName: players.fullName, position: players.position })
    .from(players)
    .where(eq(sql`coalesce(${players.playTeam}, ${players.team})`, team))
    .orderBy(asc(players.fullName));
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

/** Distinct 2025-season teams (see `players.playTeam`) — used by the 21 Generator. */
export async function listPlayTeams(): Promise<string[]> {
  const teamExpr = sql<string>`coalesce(${players.playTeam}, ${players.team})`;
  const rows = await db()
    .selectDistinct({ team: teamExpr })
    .from(players)
    .where(sql`coalesce(${players.playTeam}, ${players.team}) is not null`)
    .orderBy(asc(teamExpr));
  return rows.map((r) => r.team).filter(Boolean);
}

/**
 * Every eligible player's frozen 2025-season team in one query, grouped —
 * the 21 Generator needs every team's roster up front (it picks 5 teams
 * client-side), so looping `getTeamPlayersBare` per team is an avoidable N+1.
 */
export async function getAllPlayTeamRosters(): Promise<Map<string, BarePlayer[]>> {
  const teamExpr = sql<string>`coalesce(${players.playTeam}, ${players.team})`;
  const rows = await db()
    .select({ id: players.id, fullName: players.fullName, position: players.position, team: teamExpr })
    .from(players)
    .where(sql`coalesce(${players.playTeam}, ${players.team}) is not null`)
    .orderBy(asc(players.fullName));

  const byTeam = new Map<string, BarePlayer[]>();
  for (const { team, ...player } of rows) {
    const roster = byTeam.get(team) ?? [];
    roster.push(player);
    byTeam.set(team, roster);
  }
  return byTeam;
}

/**
 * Completed seasons the multi-year 21 Generator can offer, newest first — the
 * distinct seasons present in `player_season_team`. The UI reads this directly,
 * so a season only appears once its data has been ingested (2025 is seeded on
 * deploy; older seasons via scripts/ingest-history.ts). Empty/one-element until
 * backfills run, which is what makes shipping the code inert-until-ready.
 */
export async function listPlaySeasons(): Promise<number[]> {
  const rows = await db()
    .selectDistinct({ season: playerSeasonTeam.season })
    .from(playerSeasonTeam)
    .orderBy(desc(playerSeasonTeam.season));
  return rows.map((r) => r.season);
}

/**
 * Every team's roster for one season, grouped by the team the player was on
 * *that* season (from `player_season_team`) — the season-scoped analogue of
 * getAllPlayTeamRosters. Totals stay hidden (BarePlayer) until the reveal.
 */
export async function getSeasonRosters(season: number): Promise<Map<string, BarePlayer[]>> {
  const rows = await db()
    .select({
      id: players.id,
      fullName: players.fullName,
      position: players.position,
      team: playerSeasonTeam.team,
    })
    .from(playerSeasonTeam)
    .innerJoin(players, eq(players.id, playerSeasonTeam.playerId))
    .where(eq(playerSeasonTeam.season, season))
    .orderBy(asc(players.fullName));

  const byTeam = new Map<string, BarePlayer[]>();
  for (const { team, ...player } of rows) {
    const roster = byTeam.get(team) ?? [];
    roster.push(player);
    byTeam.set(team, roster);
  }
  return byTeam;
}

/**
 * The team each given player was on in `season`, from `player_season_team` —
 * used by the reveal to label a pick under the same team it was picked under.
 */
export async function getSeasonTeams(season: number, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db()
    .select({ playerId: playerSeasonTeam.playerId, team: playerSeasonTeam.team })
    .from(playerSeasonTeam)
    .where(and(eq(playerSeasonTeam.season, season), inArray(playerSeasonTeam.playerId, ids)));
  return new Map(rows.map((r) => [r.playerId, r.team]));
}

export interface Entrant {
  id: string;
  email: string;
  displayName: string;
  socialHandle: string | null;
  tagConsent: boolean;
  donationConfirmed: boolean;
  ageConfirmed: boolean;
  sleeperHandle: string | null;
  submittedAt: Date | null;
}

/**
 * Emails are normalised (trimmed + lowercased) at this boundary so the
 * one-lineup-per-email rule holds regardless of the casing a magic link was
 * requested with — Postgres `unique(email)` is case-sensitive, so `Foo@x.com`
 * and `foo@x.com` would otherwise be two accounts.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getEntrantByEmail(email: string): Promise<Entrant | null> {
  const [row] = await db().select().from(entrants).where(eq(entrants.email, normalizeEmail(email)));
  return row ?? null;
}

export interface NewEntrantProfile {
  email: string;
  displayName: string;
  socialHandle?: string | null;
  tagConsent: boolean;
  donationConfirmed: boolean;
  ageConfirmed: boolean;
  sleeperHandle?: string | null;
}

/** Creates the entrant row on first profile save, or updates it on later edits (pre-lock only). */
export async function upsertEntrantProfile(profile: NewEntrantProfile): Promise<Entrant> {
  const [row] = await db()
    .insert(entrants)
    .values({ id: crypto.randomUUID(), ...profile, email: normalizeEmail(profile.email) })
    .onConflictDoUpdate({
      target: entrants.email,
      set: {
        displayName: profile.displayName,
        socialHandle: profile.socialHandle ?? null,
        tagConsent: profile.tagConsent,
        donationConfirmed: profile.donationConfirmed,
        ageConfirmed: profile.ageConfirmed,
        sleeperHandle: profile.sleeperHandle ?? null,
      },
    })
    .returning();
  return row;
}

/** Raw picks (player_id + slot only) for prefilling the entry form — no TD totals needed. */
export async function getEntrantPickIds(entrantId: string): Promise<string[]> {
  const rows = await db()
    .select({ playerId: picks.playerId })
    .from(picks)
    .where(eq(picks.entrantId, entrantId))
    .orderBy(asc(picks.slot));
  return rows.map((r) => r.playerId);
}

/** Looks up players by id, for validating a submitted lineup server-side. */
export async function getPlayersByIds(
  ids: string[],
): Promise<
  { id: string; fullName: string; team: string | null; playTeam: string | null; position: string; active: boolean }[]
> {
  if (ids.length === 0) return [];
  return db()
    .select({
      id: players.id,
      fullName: players.fullName,
      team: players.team,
      playTeam: players.playTeam,
      position: players.position,
      active: players.active,
    })
    .from(players)
    .where(inArray(players.id, ids));
}

/**
 * Replaces an entrant's 5 picks atomically-ish (delete + insert; neon-http
 * has no multi-statement transactions, but this route is single-writer per
 * entrant so a clobbered intermediate state isn't a real risk). Sets
 * `submittedAt` once, on first confirmation — edits before lock don't reset
 * the tie-break clock (see PLAN.md "Win condition").
 */
export async function replacePicks(entrantId: string, playerIds: string[]): Promise<void> {
  if (playerIds.length !== 5) {
    throw new Error(`replacePicks expects exactly 5 player ids, got ${playerIds.length}`);
  }
  const conn = db();
  await conn.delete(picks).where(eq(picks.entrantId, entrantId));
  await conn.insert(picks).values(
    playerIds.map((playerId, i) => ({
      id: crypto.randomUUID(),
      entrantId,
      playerId,
      slot: i + 1,
    })),
  );
  await conn
    .update(entrants)
    .set({ submittedAt: sql`coalesce(${entrants.submittedAt}, now())` })
    .where(eq(entrants.id, entrantId));
}

export interface EntrantExportRow {
  displayName: string;
  socialHandle: string | null;
  tagConsent: boolean;
  donationConfirmed: boolean;
  ageConfirmed: boolean;
  submittedAt: Date | null;
  createdAt: Date;
  picks: string[]; // player full names, slot order
}

/**
 * Full entrant dump for the admin CSV export — display name, social handle,
 * consent + donation flags, and each lineup's 5 player names. Deliberately
 * omits email (admin asked to exclude it), and only includes entrants with a
 * confirmed lineup (submittedAt set) — drafts/abandoned profiles are skipped.
 * One DB round-trip for entrants, one for picks, stitched in memory so the
 * row order stays by submission.
 */
export async function exportEntrants(): Promise<EntrantExportRow[]> {
  const conn = db();

  const entrantRows = await conn
    .select({
      id: entrants.id,
      displayName: entrants.displayName,
      socialHandle: entrants.socialHandle,
      tagConsent: entrants.tagConsent,
      donationConfirmed: entrants.donationConfirmed,
      ageConfirmed: entrants.ageConfirmed,
      submittedAt: entrants.submittedAt,
      createdAt: entrants.createdAt,
    })
    .from(entrants)
    .where(sql`${entrants.submittedAt} is not null`)
    .orderBy(asc(entrants.submittedAt), asc(entrants.createdAt));

  const pickRows = await conn
    .select({ entrantId: picks.entrantId, fullName: players.fullName, slot: picks.slot })
    .from(picks)
    .innerJoin(players, eq(players.id, picks.playerId))
    .orderBy(asc(picks.slot));

  const picksByEntrant = new Map<string, string[]>();
  for (const p of pickRows) {
    const list = picksByEntrant.get(p.entrantId) ?? [];
    list.push(p.fullName);
    picksByEntrant.set(p.entrantId, list);
  }

  return entrantRows.map((e) => ({
    displayName: e.displayName,
    socialHandle: e.socialHandle,
    tagConsent: e.tagConsent,
    donationConfirmed: e.donationConfirmed,
    ageConfirmed: e.ageConfirmed,
    submittedAt: e.submittedAt,
    createdAt: e.createdAt,
    picks: picksByEntrant.get(e.id) ?? [],
  }));
}

export interface AdminStats {
  entrantCount: number;
  submittedCount: number;
}

/** Counts for the admin dashboard — total profiles vs. confirmed lineups. */
export async function getAdminStats(): Promise<AdminStats> {
  const [row] = await db()
    .select({
      entrantCount: sql<number>`count(*)`,
      submittedCount: sql<number>`count(${entrants.submittedAt})`,
    })
    .from(entrants);
  return { entrantCount: Number(row.entrantCount), submittedCount: Number(row.submittedCount) };
}

/**
 * Wipes all game data (entrants, picks, leaderboard via cascade) so the
 * production DB can be reset between test rounds without touching the
 * `players` reference table, `player_week_stats` cache, or Auth.js identity
 * tables. Admin-gated, irreversible.
 */
export async function resetGameData(): Promise<void> {
  await db().delete(entrants);
}

export type FeedbackStatus = "new" | "triaged" | "done";

export interface NewFeedback {
  entrantId?: string | null;
  email?: string | null;
  message: string;
  context?: string | null;
  ip?: string | null;
}

export async function insertFeedback(input: NewFeedback): Promise<void> {
  await db()
    .insert(feedback)
    .values({ id: crypto.randomUUID(), status: "new", ...input });
}

/**
 * Server-side rate-limit signal for the public feedback endpoint: how many
 * submissions matched this email or IP within the window. The per-browser
 * cookie is just fast-path UX — this DB check is the real guard, since a
 * cookie can be dropped (see PLAN.md "Rate-limit … feedback endpoints").
 */
export async function countRecentFeedback(opts: {
  email?: string | null;
  ip?: string | null;
  sinceSeconds: number;
}): Promise<number> {
  const matchers = [];
  if (opts.email) matchers.push(eq(feedback.email, opts.email));
  if (opts.ip) matchers.push(eq(feedback.ip, opts.ip));
  if (matchers.length === 0) return 0;

  const since = new Date(Date.now() - opts.sinceSeconds * 1000);
  const [row] = await db()
    .select({ n: sql<number>`count(*)` })
    .from(feedback)
    .where(and(gte(feedback.createdAt, since), or(...matchers)));
  return Number(row.n);
}

export interface FeedbackRow {
  id: string;
  email: string | null;
  message: string;
  context: string | null;
  status: FeedbackStatus;
  createdAt: Date;
}

/** All feedback, newest first — admin-only aggregation view. */
export async function listFeedback(): Promise<FeedbackRow[]> {
  const rows = await db()
    .select({
      id: feedback.id,
      email: feedback.email,
      message: feedback.message,
      context: feedback.context,
      status: feedback.status,
      createdAt: feedback.createdAt,
    })
    .from(feedback)
    .orderBy(desc(feedback.createdAt));
  return rows as FeedbackRow[];
}

export async function setFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
  await db().update(feedback).set({ status }).where(eq(feedback.id, id));
}

/** Count of magic-link send attempts for an email or IP since `since` — see `login/actions.ts`. */
export async function countLoginAttempts(input: { email?: string; ip?: string; since: Date }): Promise<number> {
  const conn = db();
  const conditions = [gt(loginAttempts.createdAt, input.since)];
  if (input.email) conditions.push(eq(loginAttempts.email, input.email));
  if (input.ip) conditions.push(eq(loginAttempts.ip, input.ip));
  const [row] = await conn
    .select({ count: sql<number>`count(*)` })
    .from(loginAttempts)
    .where(and(...conditions));
  return Number(row?.count ?? 0);
}

export async function recordLoginAttempt(email: string, ip: string): Promise<void> {
  await db()
    .insert(loginAttempts)
    .values({ id: crypto.randomUUID(), email, ip });
}

/**
 * Sums non-passing TDs per player for one season. Defaults to the live
 * game's season (`currentSeason()`) — must stay season-scoped now that
 * `playerWeekStats` also holds the 21 Generator's frozen 2025 totals
 * (see lib/db/queries.ts#getFinalSeasonTotals), or the live scoreboard and
 * player pages would double-count across seasons.
 */
async function seasonTotalsByPlayer(season: number = currentSeason()): Promise<Map<string, number>> {
  const rows = await db()
    .select({
      playerId: playerWeekStats.playerId,
      total: sql<number>`sum(${playerWeekStats.rushTd} + ${playerWeekStats.recTd} + ${playerWeekStats.returnTd} + ${playerWeekStats.recoveryTd})`,
    })
    .from(playerWeekStats)
    .where(eq(playerWeekStats.season, season))
    .groupBy(playerWeekStats.playerId);
  return new Map(rows.map((r) => [r.playerId, Number(r.total)]));
}

/** Final, deterministic per-player non-passing TD totals for one completed season — used by the 21 Generator. */
export async function getFinalSeasonTotals(season: number): Promise<Map<string, number>> {
  return seasonTotalsByPlayer(season);
}
