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
