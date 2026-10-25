import type { Metadata } from "next";
import Link from "next/link";
import { Container, Card, CardTitle, CardSubtitle } from "@/design";
import { listPickedPlayers } from "@/lib/db/queries";
import { isLocked } from "@/lib/lock";
import { PlayerSearch } from "./PlayerSearch";

export const metadata: Metadata = {
  title: "Player search · Touchdown Blackjack",
};

// Picks are frozen after lock; only the TD totals move, so a minute of ISR
// is plenty (and the RedZone refresh revalidates this path too).
export const revalidate = 60;

export default async function PlayersPage() {
  const locked = isLocked();
  const picked = locked ? await listPickedPlayers() : [];

  return (
    <Container className="space-y-6 py-8">
      <Link href="/scoreboard" className="text-sm font-medium text-violet-300 hover:text-white">
        ← Scoreboard
      </Link>

      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Who picked who?</h1>
        <p className="mt-2 text-muted">
          Search for a player to see every entrant who has them in their lineup.
        </p>
      </header>

      {!locked ? (
        <Card>
          <CardTitle>Picks are still private</CardTitle>
          <CardSubtitle>Lineups reveal at Week 1 kickoff — come back then.</CardSubtitle>
        </Card>
      ) : (
        <PlayerSearch players={picked} />
      )}
    </Container>
  );
}
