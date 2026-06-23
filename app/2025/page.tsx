import type { Metadata } from "next";
import { Container } from "@/design";
import { leaderboard2025 } from "@/lib/data/leaderboard2025";
import { Leaderboard2025 } from "./Leaderboard2025";

export const metadata: Metadata = {
  title: "Last Year (2025) · NFL Blackjack 2026",
};

export default function LastYearPage() {
  return (
    <Container className="space-y-6 py-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-300">
          2025 Season
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Last Year&apos;s Leaderboard</h1>
        <p className="mt-2 text-muted">
          The final 2025 results. No one landed on exactly 21, so prizes were raffled. Tap any
          entrant to see their five picks.
        </p>
      </header>

      <Leaderboard2025 entrants={leaderboard2025} />
    </Container>
  );
}
