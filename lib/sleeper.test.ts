import test from "node:test";
import assert from "node:assert/strict";
import { fetchPlayers, fetchRoster } from "./sleeper";

/**
 * Sleeper's primary `position` is not the whole story about who can score a
 * non-passing TD — see `eligiblePosition` in sleeper.ts. These cover the two
 * cases that bit us: a two-way player labelled by his defensive position, and
 * fullbacks.
 */
const dump: Record<string, unknown> = {
  // Two-way star: primary DB, but Sleeper still lists him as a fantasy WR.
  "12530": {
    player_id: "12530",
    full_name: "Travis Hunter",
    position: "DB",
    fantasy_positions: ["DB", "WR"],
    team: "JAX",
    status: "Active",
  },
  // Fullback: primary FB, fantasy RB. Goal-line receiving threat.
  fb1: {
    player_id: "fb1",
    full_name: "Kyle Juszczyk",
    position: "FB",
    fantasy_positions: ["RB"],
    team: "SF",
    status: "Active",
  },
  // Ordinary skill player — the common path.
  wr1: {
    player_id: "wr1",
    full_name: "Alpha Wide",
    position: "WR",
    fantasy_positions: ["WR"],
    team: "NYG",
    status: "Active",
  },
  // Defence-only and kickers stay out however they're labelled.
  db1: {
    player_id: "db1",
    full_name: "Corner Back",
    position: "CB",
    fantasy_positions: ["DB"],
    team: "DAL",
    status: "Active",
  },
  k1: { player_id: "k1", full_name: "Kick Er", position: "K", fantasy_positions: ["K"], team: "DAL", status: "Active" },
  // No usable position at all.
  x1: { player_id: "x1", full_name: "No Position", position: null, team: "DAL", status: "Active" },
};
// fetchRoster refuses anything under MIN_ROSTERED (400).
for (let i = 0; i < 420; i++) {
  dump[`r${i}`] = {
    player_id: `r${i}`,
    full_name: `Rostered ${i}`,
    position: "RB",
    fantasy_positions: ["RB"],
    team: "DAL",
    status: "Active",
  };
}

async function withDump<T>(fn: () => Promise<T>): Promise<T> {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url: RequestInfo | URL) => {
    if (String(url).endsWith("/players/nfl")) return new Response(JSON.stringify(dump), { status: 200 });
    throw new Error(`unexpected fetch: ${String(url)}`);
  };
  try {
    return await fn();
  } finally {
    globalThis.fetch = realFetch;
  }
}

test("SL1: fetchRoster falls back to fantasy_positions for two-way players and fullbacks", async () => {
  const roster = await withDump(fetchRoster);
  const byId = new Map(roster.map((p) => [p.id, p]));

  const hunter = byId.get("12530");
  assert.ok(hunter, "a DB/WR two-way player is pickable");
  assert.equal(hunter.position, "WR", "stored under the position he scores from, not his defensive label");
  assert.equal(hunter.team, "JAX");

  assert.equal(byId.get("fb1")?.position, "RB", "a fullback is stored as an RB");
  assert.equal(byId.get("wr1")?.position, "WR", "the primary position still wins when it's eligible");

  assert.ok(!byId.has("db1"), "a defence-only player is never pickable");
  assert.ok(!byId.has("k1"), "kickers are never pickable");
  assert.ok(!byId.has("x1"), "a player with no position is skipped");
});

test("SL2: fetchPlayers applies the same eligibility, ignoring team and status", async () => {
  const all = await withDump(fetchPlayers);
  const byId = new Map(all.map((p) => [p.id, p]));

  assert.equal(byId.get("12530")?.position, "WR");
  assert.equal(byId.get("fb1")?.position, "RB");
  assert.ok(!byId.has("db1"));
});
