"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { ingestSeason, computeLeaderboard } from "@/lib/jobs/refresh";
import { resetGameData, setFeedbackStatus, type FeedbackStatus } from "@/lib/db/queries";
import { currentSeason } from "@/lib/season";

export interface RefreshState {
  error?: string;
  entrantCount?: number;
}

async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) throw new Error("Not authorized");
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
  await requireAdmin();
  await setFeedbackStatus(id, status);
  revalidatePath("/admin");
}

export interface ResetState {
  error?: string;
  done?: boolean;
}

/** Deletes all entrants/picks/leaderboard rows — for clearing test data before real entries open. Irreversible. */
export async function resetGameDataAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  await requireAdmin();

  if (String(formData.get("confirm") ?? "") !== "RESET") {
    return { error: 'Type "RESET" to confirm.' };
  }

  await resetGameData();
  revalidatePath("/admin");
  revalidatePath("/scoreboard");
  return { done: true };
}

export async function refreshNow(): Promise<RefreshState> {
  await requireAdmin();

  const season = currentSeason();
  await ingestSeason(season);
  const entrantCount = await computeLeaderboard(season);

  revalidatePath("/scoreboard");
  revalidatePath("/admin");
  return { entrantCount };
}
