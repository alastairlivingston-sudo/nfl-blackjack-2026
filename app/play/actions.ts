"use server";

import { getFinalSeasonTotals, getPlayersByIds } from "@/lib/db/queries";
import { scoreLineup, type ScoredLineup } from "@/lib/scoring/score";
import { PLAY_SEASON } from "@/lib/season";

export interface RevealedPlayer {
  playerId: string;
  fullName: string;
  team: string | null;
  position: string;
  nonPassingTd: number;
}

export interface RevealState {
  error?: string;
  players?: RevealedPlayer[];
  scored?: ScoredLineup;
}

/** Stateless reveal — nothing is persisted, this just scores whatever 5 ids the client picked (see PLAN.md "21 Generator"). */
export async function revealPlayLineup(playerIds: string[]): Promise<RevealState> {
  const unique = new Set(playerIds);
  if (playerIds.length !== 5 || unique.size !== 5) {
    return { error: "Pick exactly 5 distinct players." };
  }

  const found = await getPlayersByIds(playerIds);
  if (found.length !== 5) return { error: "One or more players are invalid." };

  const totals = await getFinalSeasonTotals(PLAY_SEASON);
  const byId = new Map(found.map((p) => [p.id, p]));

  const players: RevealedPlayer[] = playerIds.map((id) => {
    const p = byId.get(id)!;
    return {
      playerId: id,
      fullName: p.fullName,
      // Frozen 2025-season team, not the live (re-imported) `team` column —
      // must match whichever team grouping the player was picked under.
      team: p.playTeam ?? p.team,
      position: p.position,
      nonPassingTd: totals.get(id) ?? 0,
    };
  });

  const scored = scoreLineup(players.map((p) => ({ playerId: p.playerId, nonPassingTd: p.nonPassingTd })));

  return { players, scored };
}
