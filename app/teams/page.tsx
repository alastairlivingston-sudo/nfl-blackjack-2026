import type { Metadata } from "next";
import Link from "next/link";
import { Container, Card } from "@/design";
import { listTeams } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Teams · Touchdown Blackjack",
};

export const revalidate = 3600;

export default async function TeamsPage() {
  const teams = await listTeams();

  return (
    <Container className="space-y-6 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Teams</h1>
      <Card className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4">
        {teams.map((team) => (
          <Link
            key={team}
            href={`/teams/${team}`}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-center font-semibold hover:bg-surface"
          >
            {team}
          </Link>
        ))}
      </Card>
    </Container>
  );
}
