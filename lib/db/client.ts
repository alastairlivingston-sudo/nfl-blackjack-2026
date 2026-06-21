import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Serverless HTTP driver (not a pooled TCP connection) — this is what lets
 * Vercel functions fan out to ~1,000 concurrent users without exhausting
 * Postgres connections. See PLAN.md "Scalability for ~1,000 users".
 */
function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add a Neon connection string to .env.local (see .env.example).",
    );
  }
  return drizzle(neon(url), { schema });
}

let cached: ReturnType<typeof getDb> | undefined;

export function db() {
  if (!cached) cached = getDb();
  return cached;
}
