"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export interface LoginState {
  error?: string;
}

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address." };

  try {
    await signIn("resend", { email, redirectTo: "/entry" });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Couldn't send the link. Check the address and try again." };
    throw err;
  }

  return {};
}
