import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
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
 * "Continue with Google" — the primary sign-in. It needs no email-sending
 * infrastructure (no domain, no SMTP, no daily send cap), and Google handles
 * the authentication security. The provider reads AUTH_GOOGLE_ID /
 * AUTH_GOOGLE_SECRET from the environment automatically (Auth.js v5
 * convention). Google still returns the user's verified email, which is the
 * same identity key the game keys off (entrants.email) — so no data-model
 * change is needed. The magic-link email provider stays registered as a
 * fallback for anyone without a Google account; the login page only surfaces
 * it when email delivery is actually configured.
 */
const providers = process.env.AUTH_GOOGLE_ID ? [Google, emailProvider] : [emailProvider];

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
  providers,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
});
