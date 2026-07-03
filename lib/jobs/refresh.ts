/**
 * Shared job logic used by both the CLI scripts (scripts/ingest-stats.ts,
 * scripts/compute-leaderboard.ts) and the Vercel Cron route handler
 * (app/api/cron/refresh-stats/route.ts) — one implementation, two callers.
 */
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entrants, picks, players, playerWeekStats, playerSeasonTeam, leaderboard } from "../db/schema";
import { fetchPlayers, fetchSeasonTeams, fetchWeekStats } from "../sleeper";
import { PLAY_SEASON } from "../season";
import { scoreLineup, rankEntrants, type PlayerTotal } from "../scoring/score";

/**
 * Repoints every player's `playTeam` to the team they actually played for in
 * the 21 Generator's PLAY_SEASON (2025) — see lib/db/schema.ts `players.playTeam`
 * for why this exists separately from the live, re-imported `team` column.
 *
 * The original backfill copied `team` directly, but that column was imported
 * during the 2026 offseason, so it already reflected free-agency/trade moves —
 * freezing it mislabeled players (e.g. Kenneth Walker, a 2025 Seahawk, under
 * KC). We instead resolve the real 2025 team from Sleeper's weekly stats and
 * overwrite. The 0009 migration applies this same mapping on deploy; this job
 * is the re-runnable source (admin route + CLI) for corrections or new seasons.
 */
export async function backfillPlayTeam(): Promise<number> {
  const conn = db();
  const ids = (await conn.select({ id: players.id }).from(players)).map((r) => r.id);
  if (ids.length === 0) return 0;

  const teams = await fetchSeasonTeams(PLAY_SEASON, ids);
  if (teams.size === 0) return 0;

  // Single round trip: a VALUES join beats ~700 individual UPDATEs over
  // neon-http. Cast the bound params to text so Postgres can type the VALUES
  // columns (untyped bind params in a VALUES list are otherwise ambiguous).
  const rows = sql.join(
    [...teams].map(([id, team]) => sql`(${id}::text, ${team}::text)`),
    sql`, `,
  );
  await conn.execute(sql`
    UPDATE ${players} AS p SET play_team = v.team
    FROM (VALUES ${rows}) AS v(id, team)
    WHERE p.id = v.id
  `);
  return teams.size;
}

export async function ingestWeek(season: number, week: number): Promise<number> {
  const stats = await fetchWeekStats(season, week);
  const scoring = stats.filter(
    (s) => s.rushTd > 0 || s.recTd > 0 || s.returnTd > 0 || s.recoveryTd > 0,
  );
  const conn = db();

  // Reflect downward corrections (e.g. a TD later rescinded): drop any rows we
  // previously stored for this week whose player no longer has a non-passing
  // TD. With no scoring players left, this clears the whole week.
  const scoringIds = scoring.map((s) => s.playerId);
  await conn
    .delete(playerWeekStats)
    .where(
      and(
        eq(playerWeekStats.season, season),
        eq(playerWeekStats.week, week),
        scoringIds.length > 0 ? notInArray(playerWeekStats.playerId, scoringIds) : undefined,
      ),
    );

  if (scoring.length === 0) return 0;

  /**
   * Sleeper's stats payload includes team-level D/ST rows ("TEAM_BUF") and
   * players outside our active QB/RB/WR/TE pool (retired, IR'd, never
   * imported) — neither exists in `players`, so inserting them unfiltered
   * trips the FK constraint and aborts the whole week's ingest.
   */
  const knownIds = new Set(
    (
      await conn
        .select({ id: players.id })
        .from(players)
        .where(inArray(players.id, scoringIds))
    ).map((r) => r.id),
  );
  const known = scoring.filter((s) => knownIds.has(s.playerId));
  if (known.length === 0) return 0;

  await conn
    .insert(playerWeekStats)
    .values(
      known.map((s) => ({
        playerId: s.playerId,
        season,
        week,
        rushTd: s.rushTd,
        recTd: s.recTd,
        returnTd: s.returnTd,
        recoveryTd: s.recoveryTd,
      })),
    )
    .onConflictDoUpdate({
      target: [playerWeekStats.playerId, playerWeekStats.season, playerWeekStats.week],
      set: {
        rushTd: sql`excluded.rush_td`,
        recTd: sql`excluded.rec_td`,
        returnTd: sql`excluded.return_td`,
        recoveryTd: sql`excluded.recovery_td`,
        updatedAt: sql`now()`,
      },
    });

  return known.length;
}

export async function ingestSeason(season: number, weeks: number[] = range(1, 18)): Promise<void> {
  for (const week of weeks) {
    await ingestWeek(season, week);
  }
}

/**
 * Ensures every skill-position player who scored a non-passing TD in `season`
 * exists in `players`, so the subsequent stats ingest (which drops any
 * player_id not already present — see ingestWeek's FK guard) keeps them. New
 * rows are inserted `active: false` with a null team; existing rows (the live,
 * currently-active pool) are left untouched via ON CONFLICT DO NOTHING, so this
 * never disturbs the live 2026 game. Returns the ids that are now importable.
 */
export async function importSeasonScorers(season: number, weeks: number[] = range(1, 18)): Promise<string[]> {
  const scorerIds = new Set<string>();
  for (const week of weeks) {
    for (const s of await fetchWeekStats(season, week)) {
      if (s.rushTd > 0 || s.recTd > 0 || s.returnTd > 0 || s.recoveryTd > 0) scorerIds.add(s.playerId);
    }
  }
  if (scorerIds.size === 0) return [];

  // Only players in the pickable QB/RB/WR/TE dump are usable; a lineman's
  // fumble-recovery TD, or a team D/ST row, has no place in the picker.
  const byId = new Map((await fetchPlayers()).map((p) => [p.id, p]));
  const importable = [...scorerIds].map((id) => byId.get(id)).filter((p) => p !== undefined);
  if (importable.length === 0) return [];

  await db()
    .insert(players)
    .values(
      importable.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        team: null,
        position: p.position,
        active: false,
        searchName: p.searchName,
      })),
    )
    .onConflictDoNothing({ target: players.id });

  return importable.map((p) => p.id);
}

/**
 * Resolves each given player's team *as of `season`* from Sleeper's weekly
 * stats and upserts it into player_season_team — the per-season analogue of
 * backfillPlayTeam. Additive: only writes the requested season's rows.
 */
export async function resolveSeasonTeams(
  season: number,
  ids: string[],
  weeks?: number[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const teams = await fetchSeasonTeams(season, ids, weeks);
  if (teams.size === 0) return 0;

  await db()
    .insert(playerSeasonTeam)
    .values([...teams].map(([playerId, team]) => ({ playerId, season, team })))
    .onConflictDoUpdate({
      target: [playerSeasonTeam.playerId, playerSeasonTeam.season],
      set: { team: sql`excluded.team` },
    });
  return teams.size;
}

/**
 * One-shot backfill of a completed season for the multi-year 21 Generator:
 * import that year's scorers, ingest their weekly non-passing TDs, then resolve
 * their per-season teams. Entirely additive (new players rows, new
 * player_week_stats rows for `season`, new player_season_team rows) — the live
 * 2026 game and the existing 2025 generator data are never touched. Idempotent:
 * safe to re-run. Drives scripts/ingest-history.ts.
 */
export async function ingestHistoricalSeason(
  season: number,
  opts: { teamWeeks?: number[] } = {},
): Promise<{ players: number; teams: number }> {
  const ids = await importSeasonScorers(season);
  await ingestSeason(season);
  // The admin "load season" button runs on a 60s serverless budget, so it can
  // pass a reduced week set for the (slow) per-week team resolution; the CLI
  // leaves it full for maximum trade-labelling accuracy.
  const teams = await resolveSeasonTeams(season, ids, opts.teamWeeks);
  return { players: ids.length, teams };
}

export async function computeLeaderboard(season: number): Promise<number> {
  const conn = db();

  const totalsRows = await conn
    .select({
      playerId: playerWeekStats.playerId,
      total: sql<number>`sum(${playerWeekStats.rushTd} + ${playerWeekStats.recTd} + ${playerWeekStats.returnTd} + ${playerWeekStats.recoveryTd})`,
    })
    .from(playerWeekStats)
    .where(eq(playerWeekStats.season, season))
    .groupBy(playerWeekStats.playerId);
  const totalsByPlayer = new Map(totalsRows.map((r) => [r.playerId, Number(r.total)]));

  const allPicks = await conn
    .select({ entrantId: picks.entrantId, playerId: picks.playerId })
    .from(picks);
  const allEntrants = await conn
    .select({ id: entrants.id, submittedAt: entrants.submittedAt })
    .from(entrants);

  const picksByEntrant = new Map<string, string[]>();
  for (const p of allPicks) {
    const list = picksByEntrant.get(p.entrantId) ?? [];
    list.push(p.playerId);
    picksByEntrant.set(p.entrantId, list);
  }

  const rankable = allEntrants
    .filter((e) => e.submittedAt && (picksByEntrant.get(e.id)?.length ?? 0) === 5)
    .map((e) => {
      const playerTotals: PlayerTotal[] = picksByEntrant
        .get(e.id)!
        .map((playerId) => ({ playerId, nonPassingTd: totalsByPlayer.get(playerId) ?? 0 }));
      return {
        entrantId: e.id,
        submittedAt: e.submittedAt!,
        scored: scoreLineup(playerTotals),
      };
    });

  const ranked = rankEntrants(rankable);
  if (ranked.length === 0) return 0;

  await conn
    .insert(leaderboard)
    .values(
      ranked.map((r) => ({
        entrantId: r.entrantId,
        totalTd: r.scored.totalTd,
        state: r.scored.state,
        valid: r.scored.valid,
        rank: r.rank,
        computedAt: new Date(),
      })),
    )
    .onConflictDoUpdate({
      target: leaderboard.entrantId,
      set: {
        totalTd: sql`excluded.total_td`,
        state: sql`excluded.state`,
        valid: sql`excluded.valid`,
        rank: sql`excluded.rank`,
        computedAt: sql`excluded.computed_at`,
      },
    });

  return ranked.length;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
