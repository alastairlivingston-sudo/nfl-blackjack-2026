"use server";

import { signIn } from "@/auth";

export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/entry" });
}
