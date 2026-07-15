"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { deleteGeneratorScore } from "@/lib/db/queries";

export interface DeleteScoreState {
  error?: string;
  ok?: boolean;
}

/**
 * Removes a single run from the 21 Generator hall of fame. Admin-only (env
 * allowlist via lib/admin.ts) so an admin can drop one entry — e.g. someone
 * who'd rather not be listed — without clearing the whole board or touching
 * the database directly.
 */
export async function removeGeneratorScore(id: string): Promise<DeleteScoreState> {
  const session = await auth();
  const email = session?.user?.email;
  if (!isAdminEmail(email)) return { error: "Not authorized." };
  if (!id) return { error: "Missing score id." };

  console.log(`[admin] ${email} deleted generator score ${id}`);
  await deleteGeneratorScore(id);
  revalidatePath("/play/leaderboard");
  return { ok: true };
}
