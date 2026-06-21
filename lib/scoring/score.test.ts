import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreLineup, rankEntrants, type PlayerTotal } from "./score";

function players(...tds: number[]): PlayerTotal[] {
  return tds.map((nonPassingTd, i) => ({ playerId: `p${i}`, nonPassingTd }));
}

test("blackjack: exactly 21 with all players scoring", () => {
  const result = scoreLineup(players(6, 5, 4, 3, 3));
  assert.equal(result.totalTd, 21);
  assert.equal(result.state, "blackjack");
  assert.equal(result.valid, true);
});

test("short: under 21", () => {
  const result = scoreLineup(players(2, 2, 2, 1, 1));
  assert.equal(result.totalTd, 8);
  assert.equal(result.state, "short");
  assert.equal(result.valid, true);
});

test("bust: over 21", () => {
  const result = scoreLineup(players(8, 7, 6, 1, 1));
  assert.equal(result.totalTd, 23);
  assert.equal(result.state, "bust");
  assert.equal(result.valid, true);
});

test("invalid: a player with 0 TDs, even if total would be 21", () => {
  const result = scoreLineup(players(0, 6, 6, 5, 4));
  assert.equal(result.totalTd, 21);
  assert.equal(result.state, "invalid");
  assert.equal(result.valid, false);
});

test("invalid: all-zero lineup", () => {
  const result = scoreLineup(players(0, 0, 0, 0, 0));
  assert.equal(result.state, "invalid");
  assert.equal(result.valid, false);
});

test("scoreLineup throws on wrong player count", () => {
  assert.throws(() => scoreLineup(players(1, 2, 3)));
});

test("rankEntrants: highest valid non-bust total wins", () => {
  const now = new Date("2026-09-10T00:00:00Z");
  const ranked = rankEntrants([
    { entrantId: "a", submittedAt: now, scored: scoreLineup(players(5, 5, 5, 3, 2)) }, // 20, short
    { entrantId: "b", submittedAt: now, scored: scoreLineup(players(6, 5, 4, 3, 3)) }, // 21, blackjack
    { entrantId: "c", submittedAt: now, scored: scoreLineup(players(8, 8, 8, 1, 1)) }, // 26, bust
  ]);
  const byId = Object.fromEntries(ranked.map((r) => [r.entrantId, r.rank]));
  assert.equal(byId.b, 1); // 21 beats 20
  assert.equal(byId.a, 2);
  assert.equal(byId.c, null); // bust can't win while a non-bust valid lineup exists
});

test("rankEntrants: ties broken by earliest submission", () => {
  const earlier = new Date("2026-09-10T00:00:00Z");
  const later = new Date("2026-09-11T00:00:00Z");
  const ranked = rankEntrants([
    { entrantId: "late", submittedAt: later, scored: scoreLineup(players(6, 5, 4, 3, 3)) }, // 21
    { entrantId: "early", submittedAt: earlier, scored: scoreLineup(players(7, 5, 4, 3, 2)) }, // 21
  ]);
  const byId = Object.fromEntries(ranked.map((r) => [r.entrantId, r.rank]));
  assert.equal(byId.early, 1);
  assert.equal(byId.late, 2);
});

test("rankEntrants: invalid lineups never rank", () => {
  const now = new Date("2026-09-10T00:00:00Z");
  const ranked = rankEntrants([
    { entrantId: "invalid", submittedAt: now, scored: scoreLineup(players(0, 6, 6, 5, 4)) },
    { entrantId: "valid", submittedAt: now, scored: scoreLineup(players(4, 4, 4, 4, 4)) }, // 20
  ]);
  const byId = Object.fromEntries(ranked.map((r) => [r.entrantId, r.rank]));
  assert.equal(byId.invalid, null);
  assert.equal(byId.valid, 1);
});

test("rankEntrants: all-bust fallback picks the lowest total (closest to 21)", () => {
  const now = new Date("2026-09-10T00:00:00Z");
  const ranked = rankEntrants([
    { entrantId: "far", submittedAt: now, scored: scoreLineup(players(10, 10, 10, 1, 1)) }, // 32
    { entrantId: "close", submittedAt: now, scored: scoreLineup(players(6, 6, 6, 5, 1)) }, // 24
  ]);
  const byId = Object.fromEntries(ranked.map((r) => [r.entrantId, r.rank]));
  assert.equal(byId.close, 1);
  assert.equal(byId.far, 2);
});

test("rankEntrants: empty input returns empty array", () => {
  assert.deepEqual(rankEntrants([]), []);
});
