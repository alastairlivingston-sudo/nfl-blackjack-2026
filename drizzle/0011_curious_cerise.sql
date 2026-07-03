CREATE TABLE "generator_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mode" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
