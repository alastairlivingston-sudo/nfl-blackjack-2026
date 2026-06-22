"use server";

import { signIn } from "@/auth";

export async function signInWithGoogle(): Promise<void> {
  // Throws a redirect to Google's consent screen; Next handles it, so we must
  // not wrap this in a try/catch that would swallow the NEXT_REDIRECT signal.
  await signIn("google", { redirectTo: "/entry" });
}
