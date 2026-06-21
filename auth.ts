import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db/client";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

/**
 * Passwordless magic-link auth (PLAN.md locked decision). JWT sessions —
 * the Drizzle adapter is only exercised for verification tokens + the
 * `users` row Auth.js needs to track who clicked a link; `accounts`/
 * `sessions` tables exist purely to satisfy the adapter's type and are
 * never written to. The actual game account is `entrants`, looked up by
 * the same email (see lib/db/queries.ts#getEntrantByEmail).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      from: process.env.AUTH_EMAIL_FROM ?? "NFL Blackjack 2026 <no-reply@nflblackjack2026.app>",
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
});
