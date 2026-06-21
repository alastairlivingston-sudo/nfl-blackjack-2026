/** The NFL season the live game is scoring, from env (see PLAN.md). */
export function currentSeason(): number {
  return Number(process.env.NFL_SEASON ?? new Date().getFullYear());
}

/** Final 2025 stats power the 21 Generator (PLAN.md "21 Generator") — fixed, not env-driven, since it's historical and deterministic. */
export const PLAY_SEASON = 2025;
