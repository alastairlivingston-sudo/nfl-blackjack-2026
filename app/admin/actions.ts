"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { ingestSeason, ingestHistoricalSeason, computeLeaderboard } from "@/lib/jobs/refresh";
import { sendCronFailureAlert } from "@/lib/email";
import { setFeedbackStatus, type FeedbackStatus } from "@/lib/db/queries";
import { currentSeason, PLAY_SEASON, PLAY_SEASON_MIN } from "@/lib/season";

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

export interface IngestSeasonState {
  error?: string;
  season?: number;
  players?: number;
  teams?: number;
}

/**
 * Loads one completed season into the multi-year 21 Generator (see PLAN.md
 * Session 9). Runs on the page's 60s budget, so it resolves per-season teams
 * over a reduced week set to stay within it; it's idempotent, so if a big
 * season times out, clicking again resumes and completes.
 */
export async function ingestPastSeason(season: number): Promise<IngestSeasonState> {
  const admin = await requireAdmin();
  if (!Number.isInteger(season) || season < PLAY_SEASON_MIN || season >= PLAY_SEASON) {
    return { error: `Season must be ${PLAY_SEASON_MIN}–${PLAY_SEASON - 1}.` };
  }
  console.log(`[admin] ${admin} loading 21 Generator season ${season}`);
  try {
    const { players, teams } = await ingestHistoricalSeason(season, {
      teamWeeks: [2, 5, 8, 11, 14, 17],
    });
    revalidatePath("/play");
    revalidatePath("/admin");
    return { season, players, teams };
  } catch (err) {
    console.error(`Season ${season} backfill failed`, err);
    return { error: "Load failed — it may have timed out; click again to resume." };
  }
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
