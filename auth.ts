import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db/client";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

/**
 * Google OAuth only — magic-link email was dropped because no transactional
 * email sender is configured for this deployment. JWT sessions; the Drizzle
 * adapter is exercised for the `accounts`/`users` rows Auth.js needs to track
 * the OAuth identity. The actual game account is `entrants`, looked up by
 * the same email (see lib/db/queries.ts#getEntrantByEmail).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [Google],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    // Replace Auth.js's cryptic default "Server error / problem with the server
    // configuration" page. The dominant real-world cause here is users arriving
    // in an embedded webview (Twitter/X, Facebook, …) where Google OAuth can't
    // complete; our page explains that and points them to their real browser.
    error: "/auth/error",
  },
});
