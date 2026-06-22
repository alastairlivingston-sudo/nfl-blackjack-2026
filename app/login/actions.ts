"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { countLoginAttempts, recordLoginAttempt } from "@/lib/db/queries";

export interface LoginState {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_EMAIL = 3; // protects a given inbox from being email-bombed
const MAX_PER_IP = 10; // protects Resend's sending reputation from one abusive client

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
}

export async function signInWithGoogle(): Promise<void> {
  // Throws a redirect to Google's consent screen; Next handles it, so we must
  // not wrap this in a try/catch that would swallow the NEXT_REDIRECT signal.
  await signIn("google", { redirectTo: "/entry" });
}

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email address." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const ip = await clientIp();
  const since = new Date(Date.now() - WINDOW_MS);
  const [emailCount, ipCount] = await Promise.all([
    countLoginAttempts({ email, since }),
    countLoginAttempts({ ip, since }),
  ]);
  if (emailCount >= MAX_PER_EMAIL || ipCount >= MAX_PER_IP) {
    return { error: "Too many sign-in attempts — wait a few minutes and try again." };
  }

  await recordLoginAttempt(email, ip);

  try {
    await signIn("resend", { email, redirectTo: "/entry" });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Couldn't send the link. Check the address and try again." };
    throw err;
  }

  return {};
}
