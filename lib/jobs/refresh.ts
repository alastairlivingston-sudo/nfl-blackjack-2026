/**
 * Shared job logic used by both the CLI scripts (scripts/ingest-stats.ts,
 * scripts/compute-leaderboard.ts) and the Vercel Cron route handler
 * (app/api/cron/refresh-stats/route.ts) — one implementation, two callers.
 */
import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { entrants, picks, players, playerWeekStats, leaderboard } from "../db/schema";
import { fetchWeekStats } from "../sleeper";
import { scoreLineup, rankEntrants, type PlayerTotal } from "../scoring/score";

/**
 * Freezes each player's current `team` into `playTeam` wherever it's still
 * null — see lib/db/schema.ts `players.playTeam` for why this needs to exist
 * separately from the live, re-imported `team` column. Idempotent: rows that
 * already have a playTeam are left untouched.
 */
export async function backfillPlayTeam(): Promise<number> {
  const result = await db()
    .update(players)
    .set({ playTeam: sql`${players.team}` })
    .where(isNull(players.playTeam));
  return result.rowCount ?? 0;
}

export async function ingestWeek(season: number, week: number): Promise<number> {
  const stats = await fetchWeekStats(season, week);
  const scoring = stats.filter((s) => s.rushTd > 0 || s.recTd > 0);
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
      })),
    )
    .onConflictDoUpdate({
      target: [playerWeekStats.playerId, playerWeekStats.season, playerWeekStats.week],
      set: {
        rushTd: sql`excluded.rush_td`,
        recTd: sql`excluded.rec_td`,
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

export async function computeLeaderboard(season: number): Promise<number> {
  const conn = db();

  const totalsRows = await conn
    .select({
      playerId: playerWeekStats.playerId,
      total: sql<number>`sum(${playerWeekStats.rushTd} + ${playerWeekStats.recTd})`,
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
