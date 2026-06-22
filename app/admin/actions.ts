"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { ingestSeason, computeLeaderboard } from "@/lib/jobs/refresh";
import { sendCronFailureAlert } from "@/lib/email";
import { resetGameData, setFeedbackStatus, type FeedbackStatus } from "@/lib/db/queries";
import { currentSeason } from "@/lib/season";

export interface RefreshState {
  error?: string;
  entrantCount?: number;
}

/** Returns the admin's email — also doubles as the audit trail for admin actions below. */
async function requireAdmin(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!isAdminEmail(email)) throw new Error("Not authorized");
  return email!;
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
  const admin = await requireAdmin();
  console.log(`[admin] ${admin} set feedback ${id} -> ${status}`);
  await setFeedbackStatus(id, status);
  revalidatePath("/admin");
}

export interface ResetState {
  error?: string;
  done?: boolean;
}

/** Deletes all entrants/picks/leaderboard rows — for clearing test data before real entries open. Irreversible. */
export async function resetGameDataAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const admin = await requireAdmin();

  if (String(formData.get("confirm") ?? "") !== "RESET") {
    return { error: 'Type "RESET" to confirm.' };
  }

  console.log(`[admin] ${admin} reset all game data`);
  await resetGameData();
  revalidatePath("/admin");
  revalidatePath("/scoreboard");
  return { done: true };
}

export async function refreshNow(): Promise<RefreshState> {
  const admin = await requireAdmin();
  console.log(`[admin] ${admin} triggered manual stats refresh`);

  const season = currentSeason();
  try {
    await ingestSeason(season);
    const entrantCount = await computeLeaderboard(season);

    revalidatePath("/scoreboard");
    revalidatePath("/admin");
    return { entrantCount };
  } catch (err) {
    console.error("Manual stats refresh failed", err);
    await sendCronFailureAlert(err);
    return { error: "Refresh failed — check logs." };
  }
}
