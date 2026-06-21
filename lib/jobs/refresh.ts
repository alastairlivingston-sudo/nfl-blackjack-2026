/**
 * Shared job logic used by both the CLI scripts (scripts/ingest-stats.ts,
 * scripts/compute-leaderboard.ts) and the Vercel Cron route handler
 * (app/api/cron/refresh-stats/route.ts) — one implementation, two callers.
 */
import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { entrants, picks, playerWeekStats, leaderboard } from "../db/schema";
import { fetchWeekStats } from "../sleeper";
import { scoreLineup, rankEntrants, type PlayerTotal } from "../scoring/score";

export async function ingestWeek(season: number, week: number): Promise<number> {
  const stats = await fetchWeekStats(season, week);
  const scoring = stats.filter((s) => s.rushTd > 0 || s.recTd > 0);
  if (scoring.length === 0) return 0;

  await db()
    .insert(playerWeekStats)
    .values(
      scoring.map((s) => ({
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

  return scoring.length;
}

export async function ingestSeason(season: number, weeks: number[] = range(1, 18)): Promise<void> {
  for (const week of weeks) {
    await ingestWeek(season, week);
  }
}

export async function computeLeaderboard(): Promise<number> {
  const conn = db();

  const totalsRows = await conn
    .select({
      playerId: playerWeekStats.playerId,
      total: sql<number>`sum(${playerWeekStats.rushTd} + ${playerWeekStats.recTd})`,
    })
    .from(playerWeekStats)
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
