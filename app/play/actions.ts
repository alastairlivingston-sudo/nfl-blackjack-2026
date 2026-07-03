"use server";

import {
  getFinalSeasonTotals,
  getPlayersByIds,
  getSeasonTeams,
  listPlaySeasons,
} from "@/lib/db/queries";
import { scoreLineup, type ScoredLineup } from "@/lib/scoring/score";
import { buildSeasonSlots, buildTeamSlot, type PlaySlot } from "./roll";

export type { PlaySlot } from "./roll";

/** A pick tied to the season of the slot it was made in. */
export interface SeasonPick {
  season: number;
  playerId: string;
}

export interface RevealedPlayer {
  playerId: string;
  fullName: string;
  team: string | null;
  position: string;
  season: number;
  nonPassingTd: number;
}

export interface RevealState {
  error?: string;
  players?: RevealedPlayer[];
  scored?: ScoredLineup;
}

/** A fresh 5-team board for a chosen season (the season selector). */
export async function rollBoard(season: number): Promise<PlaySlot[]> {
  return buildSeasonSlots(season);
}

/** Team re-roll (easy mode): a fresh slot in the same season, avoiding teams already on the board. */
export async function rollTeam(season: number, excludeTeams: string[]): Promise<PlaySlot | null> {
  return buildTeamSlot(season, excludeTeams);
}

/** Year re-roll (easy mode): a fresh slot from a random *different* available season. */
export async function rollYear(currentSeason: number): Promise<PlaySlot | null> {
  const others = (await listPlaySeasons()).filter((s) => s !== currentSeason);
  if (others.length === 0) return null;
  const season = others[Math.floor(Math.random() * others.length)];
  const [slot] = await buildSeasonSlots(season, 1);
  return slot ?? null;
}

/** Easy-mode running total: one picked player's non-passing TDs for that slot's season. */
export async function revealPick(season: number, playerId: string): Promise<number> {
  const totals = await getFinalSeasonTotals(season);
  return totals.get(playerId) ?? 0;
}

/**
 * Stateless final reveal — scores the 5 picks, each against the season of the
 * slot it came from (picks can span seasons via year re-rolls). Nothing is
 * persisted (see PLAN.md "21 Generator").
 */
export async function revealPlayLineup(picks: SeasonPick[]): Promise<RevealState> {
  const ids = picks.map((p) => p.playerId);
  if (picks.length !== 5 || new Set(ids).size !== 5) {
    return { error: "Pick exactly 5 distinct players." };
  }

  const found = await getPlayersByIds(ids);
  if (found.length !== 5) return { error: "One or more players are invalid." };
  const byId = new Map(found.map((p) => [p.id, p]));

  // Batch per distinct season: totals and team labels for that year only.
  const seasons = [...new Set(picks.map((p) => p.season))];
  const totalsBySeason = new Map(
    await Promise.all(seasons.map(async (s) => [s, await getFinalSeasonTotals(s)] as const)),
  );
  const teamsBySeason = new Map(
    await Promise.all(
      seasons.map(async (s) => {
        const seasonIds = picks.filter((p) => p.season === s).map((p) => p.playerId);
        return [s, await getSeasonTeams(s, seasonIds)] as const;
      }),
    ),
  );

  const players: RevealedPlayer[] = picks.map(({ season, playerId }) => {
    const p = byId.get(playerId)!;
    return {
      playerId,
      fullName: p.fullName,
      team: teamsBySeason.get(season)?.get(playerId) ?? p.playTeam ?? p.team,
      position: p.position,
      season,
      nonPassingTd: totalsBySeason.get(season)?.get(playerId) ?? 0,
    };
  });

  const scored = scoreLineup(players.map((p) => ({ playerId: p.playerId, nonPassingTd: p.nonPassingTd })));
  return { players, scored };
}
