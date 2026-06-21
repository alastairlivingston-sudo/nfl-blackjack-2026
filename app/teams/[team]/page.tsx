import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Card, CardTitle, PlayerRow } from "@/design";
import { getTeamPlayers } from "@/lib/db/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ team: string }>;
}): Promise<Metadata> {
  const { team } = await params;
  return { title: `${team.toUpperCase()} · NFL Blackjack 2026` };
}

export const revalidate = 60;

export default async function TeamPage({ params }: { params: Promise<{ team: string }> }) {
  const { team } = await params;
  const teamCode = team.toUpperCase();
  const roster = await getTeamPlayers(teamCode);
  if (roster.length === 0) notFound();

  return (
    <Container className="space-y-6 py-8">
      <Link href="/teams" className="text-sm font-medium text-violet-300 hover:text-white">
        ← Teams
      </Link>

      <h1 className="text-3xl font-extrabold tracking-tight">{teamCode}</h1>

      <Card>
        <CardTitle>Roster — eligible non-passing scorers</CardTitle>
        <div className="mt-3 space-y-2">
          {roster.map((p) => (
            <Link key={p.id} href={`/players/${p.id}`}>
              <PlayerRow
                name={p.fullName}
                team={`${teamCode} · ${p.position}`}
                position={p.position}
                trailing={<Tds n={p.seasonTotal} />}
              />
            </Link>
          ))}
        </div>
      </Card>
    </Container>
  );
}

function Tds({ n }: { n: number }) {
  return (
    <span className="font-mono text-sm font-bold tabular-nums text-foreground">
      {n} <span className="font-sans font-medium text-muted">TD</span>
    </span>
  );
}
