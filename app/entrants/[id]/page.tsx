import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Card, CardTitle, CardSubtitle, StatePill, ScoreMeter, PlayerRow, type LineupState } from "@/design";
import { getLineup, getScoreboardRow } from "@/lib/db/queries";
import { isLocked } from "@/lib/lock";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const row = await getScoreboardRow(id);
  return { title: row ? `${row.displayName} · NFL Blackjack 2026` : "Entrant · NFL Blackjack 2026" };
}

export default async function EntrantPage({ params }: { params: Promise<{ id: string }> }) {
  // Lineups are private until lock — see PLAN.md "Lock & reveal".
  if (!isLocked()) notFound();

  const { id } = await params;
  const [row, lineup] = await Promise.all([getScoreboardRow(id), getLineup(id)]);
  if (!row) notFound();

  return (
    <Container className="space-y-6 py-8">
      <Link href="/scoreboard" className="text-sm font-medium text-violet-300 hover:text-white">
        ← Scoreboard
      </Link>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{row.displayName}</CardTitle>
            <CardSubtitle>{row.rank ? `Rank #${row.rank}` : "Unranked"}</CardSubtitle>
          </div>
          <StatePill state={row.state as LineupState} />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted">Total non-passing TDs</span>
          <ScoreMeter total={row.totalTd} state={row.state as LineupState} />
        </div>
      </Card>

      <Card>
        <CardTitle>Lineup</CardTitle>
        <div className="mt-3 space-y-2">
          {lineup.map((p) => (
            <Link key={p.playerId} href={`/players/${p.playerId}`}>
              <PlayerRow
                name={p.fullName}
                team={`${p.team ?? "FA"} · ${p.position}`}
                position={p.position}
                trailing={<Tds n={p.nonPassingTd} />}
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
