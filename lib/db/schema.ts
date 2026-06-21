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
  team: text("team"), // null = free agent; still pickable
  position: text("position").notNull(), // QB | RB | WR | TE
  active: boolean("active").notNull().default(true),
  searchName: text("search_name").notNull(), // lowercased, for client-side typeahead filtering
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
 * rush_td + rec_td is the scoring unit everywhere downstream.
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
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.season, t.week] })],
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

export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(), // cuid
  entrantId: text("entrant_id").references(() => entrants.id, { onDelete: "set null" }),
  email: text("email"),
  message: text("message").notNull(),
  context: text("context"), // page/url the feedback was sent from
  status: text("status").notNull().default("new"), // new | triaged | done
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
