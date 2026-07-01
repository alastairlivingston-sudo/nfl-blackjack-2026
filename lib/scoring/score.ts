/**
 * Pure scoring engine — see PLAN.md "Scoring engine (precise spec)".
 * No I/O here on purpose: this module is unit-tested against fixtures and
 * called by both the Session-2 cron job and any one-off recompute script.
 */

export type LineupState = "invalid" | "short" | "blackjack" | "bust";

/** Every possible LineupState, for exhaustiveness checks (e.g. the state->colour mapping in design/components/StatePill.tsx). */
export const LINEUP_STATES: readonly LineupState[] = ["invalid", "short", "blackjack", "bust"];

export const BLACKJACK_TARGET = 21;

/** Non-passing TDs for one player, summed across the season so far. */
export interface PlayerTotal {
  playerId: string;
  nonPassingTd: number;
}

export interface ScoredLineup {
  totalTd: number;
  state: LineupState;
  /** False if any of the 5 players has 0 non-passing TDs. Invalid lineups never win. */
  valid: boolean;
}

/** Scores a single 5-player lineup from each player's season-to-date non-passing TD total. */
export function scoreLineup(players: PlayerTotal[]): ScoredLineup {
  if (players.length !== 5) {
    throw new Error(`scoreLineup expects exactly 5 players, got ${players.length}`);
  }

  const totalTd = players.reduce((sum, p) => sum + p.nonPassingTd, 0);
  const valid = players.every((p) => p.nonPassingTd >= 1);

  let state: LineupState;
  if (!valid) {
    state = "invalid";
  } else if (totalTd > BLACKJACK_TARGET) {
    state = "bust";
  } else if (totalTd === BLACKJACK_TARGET) {
    state = "blackjack";
  } else {
    state = "short";
  }

  return { totalTd, state, valid };
}

export interface RankableEntrant {
  entrantId: string;
  submittedAt: Date;
  scored: ScoredLineup;
}

export interface RankedEntrant extends RankableEntrant {
  /** 1-based rank among winners; null if this entrant can't win (invalid, or bust while a non-bust winner exists). */
  rank: number | null;
}

/**
 * Ranks entrants per the locked win condition: you must hit EXACTLY 21 to win.
 *
 * - If any VALID lineup totals 21 (blackjack), only those lineups rank — ordered
 *   by earliest submission. Every other entrant (invalid, valid short, valid bust)
 *   is unranked (`rank: null`).
 * - If NObody hits 21, prizes are raffled (a real-world action, not computed here).
 *   For a meaningful leaderboard ordering in that case we fall back to closest-to-21:
 *   among valid lineups, the highest non-bust total first; if every valid lineup
 *   busts, the lowest bust first (closest from above). Ties break by earliest
 *   submission. Invalid lineups never rank.
 */
export function rankEntrants(entrants: RankableEntrant[]): RankedEntrant[] {
  const valid = entrants.filter((e) => e.scored.valid);
  const blackjacks = valid.filter((e) => e.scored.state === "blackjack");

  const sortKey = (e: RankableEntrant) => e.submittedAt.getTime();

  let sorted: RankableEntrant[];
  if (blackjacks.length > 0) {
    // Exact 21 is the only way to win — rank the 21s by earliest submission.
    sorted = [...blackjacks].sort((a, b) => sortKey(a) - sortKey(b));
  } else {
    // Nobody hit 21: closest-to-21 ordering for display (prizes raffled IRL).
    const nonBust = valid.filter((e) => e.scored.state !== "bust");
    const pool = nonBust.length > 0 ? nonBust : valid.filter((e) => e.scored.state === "bust");
    sorted = [...pool].sort((a, b) => {
      if (nonBust.length > 0) {
        // Higher total is closer to 21 from below; ties go to earlier submission.
        if (b.scored.totalTd !== a.scored.totalTd) return b.scored.totalTd - a.scored.totalTd;
      } else {
        // All-bust fallback: lowest total (closest to 21 from above) first.
        if (a.scored.totalTd !== b.scored.totalTd) return a.scored.totalTd - b.scored.totalTd;
      }
      return sortKey(a) - sortKey(b);
    });
  }

  const rankByEntrantId = new Map(sorted.map((e, i) => [e.entrantId, i + 1]));

  return entrants.map((e) => ({ ...e, rank: rankByEntrantId.get(e.entrantId) ?? null }));
}
