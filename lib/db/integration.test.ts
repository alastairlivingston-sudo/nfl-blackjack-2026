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
} from "./queries";
import { computeLeaderboard, ingestWeek } from "../jobs/refresh";

async function seedStat(playerId: string, season: number, week: number, rush: number, rec: number) {
  await client.exec(
    `insert into player_week_stats (player_id, season, week, rush_td, rec_td)
     values ('${playerId}', ${season}, ${week}, ${rush}, ${rec})
     on conflict (player_id, season, week) do update set rush_td = excluded.rush_td, rec_td = excluded.rec_td;`,
  );
}

test("E1/E4: entrant + 5-pick lineup persists and sets submittedAt once", async () => {
  const e = await upsertEntrantProfile({ email: "a@x.com", displayName: "Al", tagConsent: false, donationConfirmed: false });
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
  const e1 = await upsertEntrantProfile({ email: "Case@X.com", displayName: "First", tagConsent: false, donationConfirmed: false });
  const e2 = await upsertEntrantProfile({ email: "case@x.com", displayName: "Second", tagConsent: false, donationConfirmed: false });
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
