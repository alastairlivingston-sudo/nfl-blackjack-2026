import { Resend } from "resend";

/** Direct Resend send for one-off notifications (feedback digests). Sign-in is Google OAuth, not email. */
export async function sendFeedbackDigest(input: { email: string | null; message: string; context: string | null }) {
  const apiKey = process.env.AUTH_RESEND_KEY;
  const to = process.env.FEEDBACK_NOTIFY_EMAIL;
  if (!apiKey || !to) return; // not configured — feedback is still saved to the DB

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.AUTH_EMAIL_FROM ?? "NFL Blackjack 2026 <no-reply@nflblackjack2026.app>",
    to,
    subject: "New feedback — NFL Blackjack 2026",
    text: [
      input.email ? `From: ${input.email}` : "From: (anonymous)",
      input.context ? `Page: ${input.context}` : null,
      "",
      input.message,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

/**
 * Best-effort alert for the daily stats-refresh cron (see
 * app/api/cron/refresh-stats/route.ts) — a silent failure here means the
 * scoreboard quietly goes stale for a day with nobody noticing. Sends to the
 * admin allowlist; never throws, since a failed alert shouldn't mask the
 * original error.
 */
export async function sendCronFailureAlert(error: unknown): Promise<void> {
  const apiKey = process.env.AUTH_RESEND_KEY;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (!apiKey || admins.length === 0) return;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.AUTH_EMAIL_FROM ?? "NFL Blackjack 2026 <no-reply@nflblackjack2026.app>",
      to: admins,
      subject: "⚠️ Stats refresh cron failed — NFL Blackjack 2026",
      text: `The daily stats refresh job threw:\n\n${error instanceof Error ? error.stack ?? error.message : String(error)}`,
    });
  } catch {
    // Don't let an alerting failure compound the original problem.
  }
}
