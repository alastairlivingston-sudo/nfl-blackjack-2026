CREATE TABLE "player_season_team" (
	"player_id" text NOT NULL,
	"season" smallint NOT NULL,
	"team" text NOT NULL,
	CONSTRAINT "player_season_team_player_id_season_pk" PRIMARY KEY("player_id","season")
);
--> statement-breakpoint
ALTER TABLE "player_season_team" ADD CONSTRAINT "player_season_team_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Seed the 21 Generator's existing PLAY_SEASON (2025) into the new per-season
-- team table from the already-resolved players.play_team, so /play reads teams
-- uniformly from player_season_team for every season. Idempotent; older
-- seasons are added later by the history ingest (lib/jobs/refresh.ts).
INSERT INTO "player_season_team" ("player_id", "season", "team")
SELECT "id", 2025, "play_team" FROM "players" WHERE "play_team" IS NOT NULL
ON CONFLICT ("player_id", "season") DO NOTHING;
