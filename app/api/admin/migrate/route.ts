import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

export const maxDuration = 60;

/**
 * One-off: production DB never ran the 0004 migration (entrants.donation_confirmed),
 * causing every post-login query against entrants to fail. Admin-session-gated;
 * safe to leave since drizzle's migrator is idempotent (tracks applied migrations
 * in its own journal table). Remove once confirmed run.
 */
export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  const db = drizzle(neon(url));
  await migrate(db, { migrationsFolder: "./drizzle" });

  return NextResponse.json({ ok: true });
}
