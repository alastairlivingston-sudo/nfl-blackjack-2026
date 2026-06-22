"use server";

import { cookies, headers } from "next/headers";
import { auth } from "@/auth";
import { countRecentFeedback, getEntrantByEmail, insertFeedback } from "@/lib/db/queries";
import { sendFeedbackDigest } from "@/lib/email";

export interface FeedbackState {
  error?: string;
  sent?: boolean;
}

const RATE_LIMIT_COOKIE = "feedback_last_sent";
const RATE_LIMIT_SECONDS = 60;

export async function submitFeedback(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const cookieStore = await cookies();
  const lastSent = cookieStore.get(RATE_LIMIT_COOKIE)?.value;
  if (lastSent && Date.now() - Number(lastSent) < RATE_LIMIT_SECONDS * 1000) {
    return { error: "You've just sent feedback — give it a minute before sending more." };
  }

  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Enter a message before sending." };
  if (message.length > 2000) return { error: "That message is too long." };

  const context = String(formData.get("context") ?? "").trim() || null;

  const session = await auth();
  const email = session?.user?.email ?? null;
  const entrant = email ? await getEntrantByEmail(email) : null;

  // Real, server-side rate limit (the cookie above is only fast-path UX and is
  // trivially dropped). Cap to one submission per window per email or IP.
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const recent = await countRecentFeedback({ email, ip, sinceSeconds: RATE_LIMIT_SECONDS });
  if (recent > 0) {
    return { error: "You've just sent feedback — give it a minute before sending more." };
  }

  await insertFeedback({ entrantId: entrant?.id ?? null, email, message, context, ip });
  await sendFeedbackDigest({ email, message, context });

  cookieStore.set(RATE_LIMIT_COOKIE, String(Date.now()), { maxAge: RATE_LIMIT_SECONDS, path: "/" });

  return { sent: true };
}
