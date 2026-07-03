import { Resend } from "resend";
import nodemailer from "nodemailer";

/**
 * One place to send a plain-text notification. Prefers **Gmail** (an app
 * password on a Google account — no domain to verify) when `GMAIL_USER` +
 * `GMAIL_APP_PASSWORD` are set; otherwise falls back to Resend if
 * `AUTH_RESEND_KEY` is set. Returns false (a no-op) when neither is configured,
 * so callers degrade gracefully. Sign-in itself is Google OAuth, not email.
 */
async function sendMail(opts: { to: string | string[]; subject: string; text: string }): Promise<boolean> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });
    // Gmail only lets you send as the authenticated account (or a verified
    // alias), so the From is the Gmail address regardless of AUTH_EMAIL_FROM.
    await transporter.sendMail({
      from: `Touchdown Blackjack <${gmailUser}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
    return true;
  }

  const apiKey = process.env.AUTH_RESEND_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.AUTH_EMAIL_FROM ?? "Touchdown Blackjack <onboarding@resend.dev>",
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
    return true;
  }

  return false; // not configured — caller no-ops
}

/** Notifies the inbox when someone leaves feedback (feedback is still saved to the DB regardless). */
export async function sendFeedbackDigest(input: { email: string | null; message: string; context: string | null }) {
  const to = process.env.FEEDBACK_NOTIFY_EMAIL ?? process.env.GMAIL_USER;
  if (!to) return;

  const text = [
    input.email ? `From: ${input.email}` : "From: (anonymous)",
    input.context ? `Page: ${input.context}` : null,
    "",
    input.message,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await sendMail({ to, subject: "New feedback — Touchdown Blackjack", text });
  } catch (err) {
    // A failed notification must never fail the user's feedback submission.
    console.error("Feedback notification failed", err);
  }
}

/**
 * Best-effort alert for the daily stats-refresh cron (see
 * app/api/cron/refresh-stats/route.ts) — a silent failure here means the
 * scoreboard quietly goes stale for a day with nobody noticing. Sends to the
 * admin allowlist; never throws, since a failed alert shouldn't mask the
 * original error.
 */
export async function sendCronFailureAlert(error: unknown): Promise<void> {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const to = admins.length > 0 ? admins : process.env.GMAIL_USER ? [process.env.GMAIL_USER] : [];
  if (to.length === 0) return;

  try {
    await sendMail({
      to,
      subject: "⚠️ Stats refresh cron failed — Touchdown Blackjack",
      text: `The daily stats refresh job threw:\n\n${error instanceof Error ? error.stack ?? error.message : String(error)}`,
    });
  } catch {
    // Don't let an alerting failure compound the original problem.
  }
}
