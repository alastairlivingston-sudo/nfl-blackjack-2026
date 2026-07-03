import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  smallint,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Reference table of NFL players eligible to be picked (active QB/RB/WR/TE).
 * Sourced from the Sleeper player dump — id is Sleeper's own player_id, kept
 * as-is so stats ingestion (Session 2) joins without any translation layer.
 */
export const players = pgTable("players", {
  id: text("id").primaryKey(), // Sleeper player_id
  fullName: text("full_name").notNull(),
  team: text("team"), // null = free agent; still pickable — current roster, re-imported each live season
  position: text("position").notNull(), // QB | RB | WR | TE
  active: boolean("active").notNull().default(true),
  searchName: text("search_name").notNull(), // lowercased, for client-side typeahead filtering
  // Frozen team-as-of the 2025 season (the 21 Generator's PLAY_SEASON). `team`
  // above is overwritten on every live-season re-import, so without this a
  // re-import after any offseason trade silently relabels a player's 2025
  // production under their new team in /play. Resolved from Sleeper's per-week
  // 2025 stats (NOT copied from `team`, which is already a 2026-offseason
  // roster) via scripts/backfill-play-team.ts, then never touched by future imports.
  playTeam: text("play_team"),
});

/**
 * One row = one account = one lineup (locked decision: one lineup per email).
 */
export const entrants = pgTable("entrants", {
  id: text("id").primaryKey(), // cuid
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  socialHandle: text("social_handle"),
  tagConsent: boolean("tag_consent").notNull().default(false),
  donationConfirmed: boolean("donation_confirmed").notNull().default(false), // self-attested, optional; tracking only — never gates entry or prizes
  ageConfirmed: boolean("age_confirmed").notNull().default(false), // self-attested 18+, required to enter
  sleeperHandle: text("sleeper_handle"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }), // set once all 5 picks are confirmed
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const picks = pgTable(
  "picks",
  {
    id: text("id").primaryKey(), // cuid
    entrantId: text("entrant_id")
      .notNull()
      .references(() => entrants.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id),
    slot: smallint("slot").notNull(), // 1..5, display order only
  },
  (t) => [unique("picks_entrant_player_unique").on(t.entrantId, t.playerId)],
);

/**
 * Weekly non-passing TD cache, ingested from Sleeper stats (Session 2).
 * The scoring unit everywhere downstream is rush_td + rec_td + return_td +
 * recovery_td (rushing, receiving, kick/punt-return, and fumble-recovery TDs).
 */
export const playerWeekStats = pgTable(
  "player_week_stats",
  {
    playerId: text("player_id")
      .notNull()
      .references(() => players.id),
    season: smallint("season").notNull(),
    week: smallint("week").notNull(),
    rushTd: integer("rush_td").notNull().default(0),
    recTd: integer("rec_td").notNull().default(0),
    returnTd: integer("return_td").notNull().default(0), // Sleeper st_td (kick/punt return)
    recoveryTd: integer("recovery_td").notNull().default(0), // Sleeper fum_rec_td
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.season, t.week] })],
);

/**
 * Per-(player, season) team for the 21 Generator's multi-year mode. A player's
 * team varies by season, so the single frozen `players.playTeam` (2025 only)
 * can't label historical rosters — "Broncos 2021" needs the team a player was
 * on *that* year. Populated additively per season (2025 seeded from
 * `players.playTeam` in a data migration; older seasons via the history
 * ingest, see lib/jobs/refresh.ts#ingestHistoricalSeason). Never touches the
 * live 2026 game.
 */
export const playerSeasonTeam = pgTable(
  "player_season_team",
  {
    playerId: text("player_id")
      .notNull()
      .references(() => players.id),
    season: smallint("season").notNull(),
    team: text("team").notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.season] })],
);

/**
 * Precomputed scoreboard (Session 2 cron writes this; reads never hit raw
 * picks/stats so 1,000 concurrent viewers hit cache, not live joins).
 */
export const leaderboard = pgTable("leaderboard", {
  entrantId: text("entrant_id")
    .primaryKey()
    .references(() => entrants.id, { onDelete: "cascade" }),
  totalTd: integer("total_td").notNull(),
  state: text("state").notNull(), // invalid | short | blackjack | bust
  valid: boolean("valid").notNull(),
  rank: integer("rank"), // null until valid + non-bust
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Auth.js (NextAuth v5) tables, shaped to match @auth/drizzle-adapter's
 * Postgres defaults exactly so `DrizzleAdapter(db, {...})` type-checks.
 * Session strategy is JWT (see auth.ts) — `sessions` exists only because the
 * adapter's type requires it; it's never written to. `accounts` is written
 * to on Google (OAuth) sign-in to link the provider account to the `users`
 * row. The actual game account is `entrants`, keyed by the same verified
 * email Google returns.
 */
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/**
 * Tracks magic-link send attempts so `login/actions.ts` can rate-limit both
 * per-email (stop someone email-bombing one address) and per-IP (stop one
 * client spraying requests across many addresses). Rows older than the
 * rate-limit window are irrelevant noise but cheap enough to leave — there's
 * no realistic volume that makes pruning worth the complexity at this scale.
 */
export const loginAttempts = pgTable("login_attempts", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  ip: text("ip").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(), // cuid
  entrantId: text("entrant_id").references(() => entrants.id, { onDelete: "set null" }),
  email: text("email"),
  message: text("message").notNull(),
  context: text("context"), // page/url the feedback was sent from
  ip: text("ip"), // request IP, for server-side rate limiting of the public endpoint
  status: text("status").notNull().default("new"), // new | triaged | done
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
