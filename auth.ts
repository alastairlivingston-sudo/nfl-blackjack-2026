import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import Nodemailer from "next-auth/providers/nodemailer";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db/client";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

const from = process.env.AUTH_EMAIL_FROM ?? "NFL Blackjack 2026 <no-reply@nflblackjack2026.app>";

/**
 * Magic-link transport: SMTP (e.g. Gmail + an App Password) when configured,
 * since it can deliver to any recipient without a verified sending domain —
 * Resend's free tier only delivers to the account owner's own address.
 * Resend stays as a fallback so existing deployments without SMTP env vars
 * configured keep working. Provider id is kept as "resend" either way so
 * `login/actions.ts`'s `signIn("resend", ...)` call doesn't need to branch.
 */
const emailProvider = process.env.EMAIL_SERVER_HOST
  ? Nodemailer({
      id: "resend",
      from,
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 465),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
    })
  : Resend({ from });

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
  providers: [emailProvider],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
});
