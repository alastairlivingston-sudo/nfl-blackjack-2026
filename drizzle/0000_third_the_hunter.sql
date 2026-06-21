CREATE TABLE "entrants" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"social_handle" text,
	"tag_consent" boolean DEFAULT false NOT NULL,
	"sleeper_handle" text,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entrants_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"entrant_id" text,
	"email" text,
	"message" text NOT NULL,
	"context" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard" (
	"entrant_id" text PRIMARY KEY NOT NULL,
	"total_td" integer NOT NULL,
	"state" text NOT NULL,
	"valid" boolean NOT NULL,
	"rank" integer,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "picks" (
	"id" text PRIMARY KEY NOT NULL,
	"entrant_id" text NOT NULL,
	"player_id" text NOT NULL,
	"slot" smallint NOT NULL,
	CONSTRAINT "picks_entrant_player_unique" UNIQUE("entrant_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "player_week_stats" (
	"player_id" text NOT NULL,
	"season" smallint NOT NULL,
	"week" smallint NOT NULL,
	"rush_td" integer DEFAULT 0 NOT NULL,
	"rec_td" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_week_stats_player_id_season_week_pk" PRIMARY KEY("player_id","season","week")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"team" text,
	"position" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"search_name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_entrant_id_entrants_id_fk" FOREIGN KEY ("entrant_id") REFERENCES "public"."entrants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_entrant_id_entrants_id_fk" FOREIGN KEY ("entrant_id") REFERENCES "public"."entrants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_entrant_id_entrants_id_fk" FOREIGN KEY ("entrant_id") REFERENCES "public"."entrants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_week_stats" ADD CONSTRAINT "player_week_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;