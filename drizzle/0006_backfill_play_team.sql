-- One-time data backfill: freeze each player's current team into play_team
-- wherever it's still null. Idempotent — rows that already have a play_team
-- are left untouched, so this is a no-op on every run after the first.
UPDATE "players" SET "play_team" = "team" WHERE "play_team" IS NULL;
