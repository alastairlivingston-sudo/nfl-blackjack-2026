/**
 * In-process integration tests: boots PGlite (real Postgres in WASM), applies
 * the actual drizzle migrations, and exercises the real query + scoring +
 * leaderboard code through `db()`. This covers the "needs a live DB" user
 * stories (QA/feature-tracker.csv) without a Neon connection. Magic-link email
 * delivery and browser UX are still out of scope here.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { __setTestDb } from "./client";

// Pin the season the live game scores so currentSeason() is deterministic here.
process.env.NFL_SEASON = "2026";

let client: PGlite;

before(async () => {
  client = new PGlite();
  const orm = drizzle(client, { schema });
  __setTestDb(orm);

  // Apply every committed migration in order, splitting on drizzle's breakpoint.
  const dir = join(process.cwd(), "drizzle");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql") && /^\d{4}_/.test(f)).sort();
  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    for (const stmt of sql.split("--> statement-breakpoint")) {
      const trimmed = stmt.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }

  // Minimal player reference data (Sleeper ids as PK, like production).
  await client.exec(`
    insert into players (id, full_name, team, position, active, search_name) values
      ('p1','Alpha Back','SF','RB',true,'alpha back'),
      ('p2','Bravo Wide','DAL','WR',true,'bravo wide'),
      ('p3','Charlie End','KC','TE',true,'charlie end'),
      ('p4','Delta Qub','PHI','QB',true,'delta qub'),
      ('p5','Echo Back','ATL','RB',true,'echo back'),
      ('p6','Foxtrot Wide','SF','WR',true,'foxtrot wide');
  `);
});

import {
  upsertEntrantProfile,
  getEntrantByEmail,
  replacePicks,
  getEnteredEntrants,
  getScoreboard,
  getLineup,
  getPlayer,
  getFinalSeasonTotals,
  insertFeedback,
  countRecentFeedback,
  getAdminStats,
  getTeamPlayersBare,
  listPlayTeams,
  getPlayersByIds,
  listPlaySeasons,
  getSeasonRosters,
  getSeasonTeams,
  insertGeneratorScore,
  getGeneratorLeaderboard,
  countFasterGeneratorScores,
} from "./queries";
import {
  computeLeaderboard,
  ingestWeek,
  ingestSeason,
  ingestHistoricalSeason,
} from "../jobs/refresh";

async function seedStat(
  playerId: string,
  season: number,
  week: number,
  rush: number,
  rec: number,
  ret = 0,
  recovery = 0,
) {
  await client.exec(
    `insert into player_week_stats (player_id, season, week, rush_td, rec_td, return_td, recovery_td)
     values ('${playerId}', ${season}, ${week}, ${rush}, ${rec}, ${ret}, ${recovery})
     on conflict (player_id, season, week) do update set
       rush_td = excluded.rush_td, rec_td = excluded.rec_td,
       return_td = excluded.return_td, recovery_td = excluded.recovery_td;`,
  );
}

test("E1/E4: entrant + 5-pick lineup persists and sets submittedAt once", async () => {
  const e = await upsertEntrantProfile({ email: "a@x.com", displayName: "Al", tagConsent: false, donationConfirmed: false, ageConfirmed: true });
  await replacePicks(e.id, ["p1", "p2", "p3", "p4", "p5"]);
  const first = await getEntrantByEmail("a@x.com");
  assert.ok(first?.submittedAt, "submittedAt set on first confirm");

  // Editing the lineup must NOT reset the tie-break clock.
  await new Promise((r) => setTimeout(r, 5));
  await replacePicks(e.id, ["p1", "p2", "p3", "p4", "p6"]);
  const second = await getEntrantByEmail("a@x.com");
  assert.equal(second?.submittedAt?.getTime(), first?.submittedAt?.getTime(), "submittedAt unchanged on edit");
});

test("F4: one lineup per email regardless of casing", async () => {
  const e1 = await upsertEntrantProfile({ email: "Case@X.com", displayName: "First", tagConsent: false, donationConfirmed: false, ageConfirmed: true });
  const e2 = await upsertEntrantProfile({ email: "case@x.com", displayName: "Second", tagConsent: false, donationConfirmed: false, ageConfirmed: true });
  assert.equal(e1.id, e2.id, "same row reused across casings");
  const found = await getEntrantByEmail("CASE@x.COM");
  assert.equal(found?.displayName, "Second", "lookup is case-insensitive and saw the update");
});

test("S1: pre-lock entered list shows submitted entrants immediately (no cron needed)", async () => {
  const entered = await getEnteredEntrants();
  const names = entered.map((e) => e.displayName);
  assert.ok(names.includes("Al"), "submitted entrant appears without any leaderboard compute");
});

test("ST3/ST4: stats season isolation + computeLeaderboard ranking", async () => {
  // 2026 (live): Al's lineup p1,p2,p3,p4,p6 -> give totals summing to 21, all >=1.
  await seedStat("p1", 2026, 1, 6, 0); // 6
  await seedStat("p2", 2026, 1, 0, 5); // 5
  await seedStat("p3", 2026, 1, 0, 4); // 4
  await seedStat("p4", 2026, 1, 3, 0); // 3
  await seedStat("p6", 2026, 1, 0, 3); // 3  => total 21, blackjack, valid
  // 2025 (play season): different numbers for the same player to prove isolation.
  await seedStat("p1", 2025, 1, 1, 0);

  const n = await computeLeaderboard(2026);
  assert.equal(n, 1, "one ranked entrant");

  const board = await getScoreboard();
  assert.equal(board.length, 1);
  assert.equal(board[0].totalTd, 21);
  assert.equal(board[0].state, "blackjack");
  assert.equal(board[0].valid, true);
  assert.equal(board[0].rank, 1);

  const totals2025 = await getFinalSeasonTotals(2025);
  assert.equal(totals2025.get("p1"), 1, "2025 total isolated from 2026");
  const player = await getPlayer("p1");
  assert.equal(player?.seasonTotal, 6, "getPlayer uses live season (2026) only");
});

test("S4: getLineup returns the 5 picks with live-season TD totals", async () => {
  const e = await getEntrantByEmail("a@x.com");
  const lineup = await getLineup(e!.id);
  assert.equal(lineup.length, 5);
  const p1 = lineup.find((p) => p.playerId === "p1");
  assert.equal(p1?.nonPassingTd, 6);
});

test("F1/F2: feedback persists and is rate-limited server-side by email", async () => {
  await insertFeedback({ email: "fb@x.com", message: "hi", context: "/", ip: "1.2.3.4" });
  const byEmail = await countRecentFeedback({ email: "fb@x.com", ip: null, sinceSeconds: 60 });
  assert.equal(byEmail, 1, "recent submission counted -> would block a second within the window");
  const byIp = await countRecentFeedback({ email: null, ip: "1.2.3.4", sinceSeconds: 60 });
  assert.equal(byIp, 1, "IP dimension also counts");
  const none = await countRecentFeedback({ email: "other@x.com", ip: "9.9.9.9", sinceSeconds: 60 });
  assert.equal(none, 0, "unrelated email/IP not limited");
});

test("ST1/ST2/ST3: ingestWeek upserts known players, drops unknown/team rows, corrects downward", async () => {
  const realFetch = globalThis.fetch;
  const stub = (payload: unknown) => {
    globalThis.fetch = async () => new Response(JSON.stringify(payload), { status: 200 });
  };
  try {
    // Sleeper-shaped payload: 2 known players + an unknown id + a team D/ST row.
    stub({ p1: { rush_td: 2 }, p2: { rec_td: 1 }, NOPE: { rush_td: 5 }, TEAM_SF: { rush_td: 9 } });
    const ingested = await ingestWeek(2099, 1);
    assert.equal(ingested, 2, "unknown id and team row dropped (FK-safe)");
    let res = await client.query<{ player_id: string }>(
      `select player_id from player_week_stats where season=2099 and week=1 order by player_id`,
    );
    assert.deepEqual(res.rows.map((r) => r.player_id), ["p1", "p2"]);

    // Re-run with p1's TD rescinded (now scoreless) — its row must disappear.
    stub({ p2: { rec_td: 1 } });
    const corrected = await ingestWeek(2099, 1);
    assert.equal(corrected, 1);
    res = await client.query<{ player_id: string }>(
      `select player_id from player_week_stats where season=2099 and week=1 order by player_id`,
    );
    assert.deepEqual(res.rows.map((r) => r.player_id), ["p2"], "rescinded p1 removed, p2 kept");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("AD2: admin stats count profiles vs confirmed lineups", async () => {
  const stats = await getAdminStats();
  assert.ok(stats.entrantCount >= 1);
  assert.equal(stats.submittedCount, 1, "only the one entrant with picks is submitted");
});

test("PLAY1: a player traded since import stays grouped/labelled under their frozen 2025 team", async () => {
  // p1 was seeded with team='SF' and play_team is still null (never backfilled).
  // Simulate the 21 Generator's own page.tsx flow: groups must come from the
  // play-season team, not the live `team` column re-imported for 2026.
  let sfRoster = await getTeamPlayersBare("SF");
  assert.ok(sfRoster.some((p) => p.id === "p1"), "p1 groups under SF before any trade/backfill");

  // A live re-import for the 2026 season trades p1 to KC, but play_team is
  // never touched by that import (only the backfill script sets it).
  await client.exec(`update players set team = 'KC' where id = 'p1';`);

  // Without a frozen play_team, p1 would now vanish from SF's /play roster
  // and silently reappear under KC — the exact "spin a team, get a different
  // team's players" bug. Backfill freezes today's value.
  await client.exec(`update players set play_team = 'SF' where id = 'p1' and play_team is null;`);

  sfRoster = await getTeamPlayersBare("SF");
  assert.ok(sfRoster.some((p) => p.id === "p1"), "p1 still groups under SF after the live trade, via play_team");

  const kcRoster = await getTeamPlayersBare("KC");
  assert.ok(!kcRoster.some((p) => p.id === "p1"), "p1 does not leak into KC's play roster despite the live trade");

  const teams = await listPlayTeams();
  assert.ok(teams.includes("SF"), "listPlayTeams reflects the frozen team, not the live one");

  // The reveal screen must show the same team the player was picked under.
  const [revealed] = await getPlayersByIds(["p1"]);
  assert.equal(revealed.playTeam, "SF", "reveal team matches the team the player was spun/picked under");
  assert.equal(revealed.team, "KC", "live `team` column still reflects the real 2026 trade for the live game");
});

test("ST5: totals sum all four non-passing TD categories, not just rush/rec", async () => {
  await client.exec(`
    insert into players (id, full_name, team, position, active, search_name) values
      ('p7','Golf Back','NYJ','RB',true,'golf back'),
      ('p8','Hotel Wide','MIA','WR',true,'hotel wide'),
      ('p9','India End','BUF','TE',true,'india end'),
      ('p10','Juliet Back','LAR','RB',true,'juliet back'),
      ('p11','Kilo Wide','SEA','WR',true,'kilo wide');
  `);

  // p7 alone racks up all four categories across two weeks — if any category
  // were dropped from an aggregation site, this total would come up short.
  await seedStat("p7", 2026, 2, 2, 0, 0, 0); // rush_td=2
  await seedStat("p7", 2026, 3, 0, 3, 0, 0); // rec_td=3
  await seedStat("p7", 2026, 4, 0, 0, 1, 0); // return_td=1 (Sleeper st_td)
  await seedStat("p7", 2026, 5, 0, 0, 0, 1); // recovery_td=1 (Sleeper fum_rec_td)
  await seedStat("p8", 2026, 2, 0, 5, 0, 0);
  await seedStat("p9", 2026, 2, 0, 4, 0, 0);
  await seedStat("p10", 2026, 2, 3, 0, 0, 0);
  await seedStat("p11", 2026, 2, 0, 3, 0, 0); // 5+4+3+3=15, plus p7's 7 => 22 total (bust)

  const e = await upsertEntrantProfile({
    email: "st5@x.com",
    displayName: "St5",
    tagConsent: false,
    donationConfirmed: false,
    ageConfirmed: true,
  });
  await replacePicks(e.id, ["p7", "p8", "p9", "p10", "p11"]);

  const player = await getPlayer("p7");
  assert.equal(player?.seasonTotal, 7, "rush + rec + return + recovery all counted for one player");

  await computeLeaderboard(2026);
  const lineup = await getLineup(e.id);
  const p7Row = lineup.find((p) => p.playerId === "p7");
  assert.equal(p7Row?.nonPassingTd, 7, "getLineup also sums all four categories");

  const board = await getScoreboard();
  const entry = board.find((b) => b.entrantId === e.id);
  assert.equal(entry?.totalTd, 22, "leaderboard total reflects every category, not just rush/rec");
  assert.equal(entry?.state, "bust");
});

test("ST6: ingestSeason's default week range covers exactly weeks 1-18, no more no less", async () => {
  const realFetch = globalThis.fetch;
  const requestedWeeks: number[] = [];
  globalThis.fetch = async (url: RequestInfo | URL) => {
    const match = String(url).match(/\/stats\/nfl\/regular\/\d+\/(\d+)$/);
    if (match) requestedWeeks.push(Number(match[1]));
    return new Response(JSON.stringify({}), { status: 200 }); // no scoring players
  };
  try {
    await ingestSeason(2097);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.deepEqual(
    requestedWeeks,
    Array.from({ length: 18 }, (_, i) => i + 1),
    "a full-season refresh hits every week 1-18 in order, so a corrected earlier week is never skipped",
  );
});

test("MY1: multi-year read path groups rosters and totals by the picked season", async () => {
  // Simulate a backfilled season 2090 directly (no network): per-season teams +
  // that year's weekly non-passing TDs. This is exactly the state the /play
  // generator reads for a historical year.
  await client.exec(`
    insert into player_season_team (player_id, season, team) values
      ('p1', 2090, 'DEN'), ('p2', 2090, 'DEN'), ('p3', 2090, 'LV');
  `);
  await seedStat("p1", 2090, 1, 4, 0); // 4
  await seedStat("p2", 2090, 1, 0, 2); // 2
  await seedStat("p3", 2090, 1, 0, 0, 1, 0); // 1 (return TD)

  const rosters = await getSeasonRosters(2090);
  assert.deepEqual(
    (rosters.get("DEN") ?? []).map((p) => p.id).sort(),
    ["p1", "p2"],
    "players grouped under the team they were on that season",
  );
  assert.deepEqual((rosters.get("LV") ?? []).map((p) => p.id), ["p3"]);

  const totals = await getFinalSeasonTotals(2090);
  assert.equal(totals.get("p1"), 4);
  assert.equal(totals.get("p3"), 1, "return TD counted in the season total");

  const teams = await getSeasonTeams(2090, ["p1", "p3"]);
  assert.equal(teams.get("p1"), "DEN");
  assert.equal(teams.get("p3"), "LV");

  const seasons = await listPlaySeasons();
  assert.ok(seasons.includes(2090), "the backfilled season is offered by the generator");
  assert.deepEqual(seasons, [...seasons].sort((a, b) => b - a), "seasons come back newest-first");
});

test("MY2: ingestHistoricalSeason additively imports retired scorers, FK-safe, resolves per-season teams", async () => {
  const realFetch = globalThis.fetch;
  // Sleeper's player dump needs >=300 skill players to pass the sanity guard.
  const dump: Record<string, unknown> = {
    h1: { player_id: "h1", full_name: "Hist One", position: "RB" },
    h2: { player_id: "h2", full_name: "Hist Two", position: "WR" },
    p1: { player_id: "p1", full_name: "Alpha Back", position: "RB" },
  };
  for (let i = 0; i < 320; i++) dump[`f${i}`] = { player_id: `f${i}`, full_name: `Filler ${i}`, position: "RB" };

  // h1/h2 are retired scorers not in `players`; p1 is already active; ol99 is a
  // scorer absent from the dump; TEAM_DEN is a team row. Only h1/h2/p1 survive.
  const week1 = { h1: { rush_td: 3 }, h2: { rec_td: 2 }, p1: { rush_td: 1 }, ol99: { fum_rec_td: 1 }, TEAM_DEN: { rush_td: 9 } };
  const seasonTeams: Record<string, string> = { h1: "DEN", h2: "DEN", p1: "SF" };

  globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.endsWith("/players/nfl")) return new Response(JSON.stringify(dump), { status: 200 });
    const statMatch = u.match(/\/stats\/nfl\/regular\/2088\/(\d+)$/);
    if (statMatch) {
      return new Response(JSON.stringify(Number(statMatch[1]) === 1 ? week1 : {}), { status: 200 });
    }
    if (u.includes("graphql")) {
      const body = String(init?.body ?? "");
      const rows = Object.entries(seasonTeams)
        .filter(([id]) => body.includes(id))
        .map(([player_id, team]) => ({ player_id, team }));
      return new Response(JSON.stringify({ data: { stats_for_players_in_week: rows } }), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${u}`);
  };

  try {
    const res = await ingestHistoricalSeason(2088);
    assert.deepEqual(res, { players: 3, teams: 3 });
  } finally {
    globalThis.fetch = realFetch;
  }

  // Retired scorers were added inactive; the existing active player is untouched.
  const rows = await client.query<{ id: string; active: boolean }>(
    `select id, active from players where id in ('h1','h2','p1','ol99') order by id`,
  );
  assert.deepEqual(
    rows.rows.map((r) => `${r.id}:${r.active}`),
    ["h1:false", "h2:false", "p1:true"],
    "h1/h2 imported inactive; p1 left active (ON CONFLICT DO NOTHING); ol99 never imported",
  );

  // Stats for the season only include FK-valid players.
  const stats = await client.query<{ player_id: string }>(
    `select player_id from player_week_stats where season=2088 order by player_id`,
  );
  assert.deepEqual(stats.rows.map((r) => r.player_id), ["h1", "h2", "p1"], "ol99/TEAM_DEN dropped");

  const totals = await getFinalSeasonTotals(2088);
  assert.equal(totals.get("h1"), 3);
  assert.equal(totals.get("h2"), 2);

  const rosters = await getSeasonRosters(2088);
  assert.deepEqual((rosters.get("DEN") ?? []).map((p) => p.id).sort(), ["h1", "h2"]);
  assert.deepEqual((rosters.get("SF") ?? []).map((p) => p.id), ["p1"]);
});

test("MY3: generator leaderboard ranks by speed and is isolated per mode", async () => {
  await insertGeneratorScore({ name: "Slow", mode: "easy", durationMs: 30000 });
  await insertGeneratorScore({ name: "Fast", mode: "easy", durationMs: 12000 });
  await insertGeneratorScore({ name: "Mid", mode: "easy", durationMs: 20000 });
  await insertGeneratorScore({ name: "HardOnly", mode: "hard", durationMs: 5000 });

  const easy = await getGeneratorLeaderboard("easy");
  assert.deepEqual(
    easy.map((r) => r.name),
    ["Fast", "Mid", "Slow"],
    "fastest first, and the hard-mode run doesn't leak into easy",
  );

  const hard = await getGeneratorLeaderboard("hard");
  assert.deepEqual(hard.map((r) => r.name), ["HardOnly"]);

  // A 15s run would sit behind only the 12s run -> rank 2.
  assert.equal(await countFasterGeneratorScores("easy", 15000), 1, "one easy run is strictly faster than 15s");
  assert.equal(await countFasterGeneratorScores("easy", 10000), 0, "nothing faster than 10s -> would be #1");
});
