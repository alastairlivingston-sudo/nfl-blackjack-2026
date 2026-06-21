/**
 * Single-deadline lock (see PLAN.md "Lock & reveal"): lineups are editable
 * until Week 1 kickoff, then frozen and publicly revealed. `LOCK_AT` is an
 * ISO timestamp env var so the real kickoff time can be set without a code
 * change; Session 4 wires the entry form to the same constant.
 */
export function lockAt(): Date | null {
  const raw = process.env.LOCK_AT;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Before LOCK_AT is set, treat entries as unlocked (Session 4 hasn't shipped yet). */
export function isLocked(now: Date = new Date()): boolean {
  const at = lockAt();
  return at !== null && now >= at;
}
