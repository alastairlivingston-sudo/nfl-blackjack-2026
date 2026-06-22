"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import {
  getEntrantByEmail,
  getPlayersByIds,
  replacePicks,
  upsertEntrantProfile,
} from "@/lib/db/queries";
import { isLocked } from "@/lib/lock";

export interface ActionState {
  error?: string;
}

async function requireEmail(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Not signed in");
  return email;
}

export async function saveProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isLocked()) return { error: "Entries are locked — Week 1 has kicked off." };

  const email = await requireEmail();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) return { error: "Display name is required." };
  if (displayName.length > 60) return { error: "Display name is too long." };

  const socialHandle = String(formData.get("socialHandle") ?? "").trim() || null;
  const tagConsent = formData.get("tagConsent") === "on";
  const donationConfirmed = formData.get("donationConfirmed") === "on";

  await upsertEntrantProfile({ email, displayName, socialHandle, tagConsent, donationConfirmed });
  revalidatePath("/entry");
  return {};
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function saveLineup(playerIds: string[]): Promise<ActionState> {
  if (isLocked()) return { error: "Entries are locked — Week 1 has kicked off." };

  const email = await requireEmail();
  const entrant = await getEntrantByEmail(email);
  if (!entrant) return { error: "Complete your profile first." };

  const unique = new Set(playerIds);
  if (playerIds.length !== 5 || unique.size !== 5) {
    return { error: "Pick exactly 5 distinct players." };
  }

  const found = await getPlayersByIds(playerIds);
  if (found.length !== 5) return { error: "One or more players are invalid." };

  await replacePicks(entrant.id, playerIds);
  revalidatePath("/entry");
  revalidatePath("/scoreboard");
  return {};
}
