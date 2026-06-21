"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { ingestSeason, computeLeaderboard } from "@/lib/jobs/refresh";

export interface RefreshState {
  error?: string;
  entrantCount?: number;
}

async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) throw new Error("Not authorized");
}

export async function refreshNow(): Promise<RefreshState> {
  await requireAdmin();

  const season = Number(process.env.NFL_SEASON ?? new Date().getFullYear());
  await ingestSeason(season);
  const entrantCount = await computeLeaderboard();

  revalidatePath("/scoreboard");
  revalidatePath("/admin");
  return { entrantCount };
}
