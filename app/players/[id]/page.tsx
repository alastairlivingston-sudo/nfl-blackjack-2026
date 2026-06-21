import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Card, CardTitle, CardSubtitle, PositionBadge, Badge } from "@/design";
import { getPlayer, getPlayerPickers } from "@/lib/db/queries";
import { isLocked } from "@/lib/lock";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const player = await getPlayer(id);
  return { title: player ? `${player.fullName} · NFL Blackjack 2026` : "Player · NFL Blackjack 2026" };
}

export const revalidate = 60;

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayer(id);
  if (!player) notFound();

  const locked = isLocked();
  const pickers = locked ? await getPlayerPickers(id) : [];

  return (
    <Container className="space-y-6 py-8">
      <Link href="/scoreboard" className="text-sm font-medium text-violet-300 hover:text-white">
        ← Scoreboard
      </Link>

      <Card>
        <div className="flex items-center gap-3">
          <PositionBadge position={player.position} />
          <div>
            <CardTitle>{player.fullName}</CardTitle>
            <CardSubtitle>
              {player.team ? (
                <Link href={`/teams/${player.team}`} className="hover:text-foreground">
                  {player.team}
                </Link>
              ) : (
                "Free agent"
              )}
            </CardSubtitle>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted">Non-passing TDs (season)</span>
          <span className="text-3xl font-extrabold tabular-nums">{player.seasonTotal}</span>
        </div>
      </Card>

      <Card>
        <CardTitle>Weekly log</CardTitle>
        {player.weeks.length === 0 ? (
          <CardSubtitle>No scoring weeks yet.</CardSubtitle>
        ) : (
          <div className="mt-3 space-y-2">
            {player.weeks.map((w) => (
              <div
                key={w.week}
                className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3.5 py-2.5"
              >
                <span className="font-semibold">Week {w.week}</span>
                <span className="font-mono text-sm tabular-nums text-muted">
                  {w.rushTd} rush · {w.recTd} rec
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {locked && pickers.length > 0 ? (
        <Card>
          <CardTitle>Picked by</CardTitle>
          <div className="mt-3 flex flex-wrap gap-2">
            {pickers.map((p) => (
              <Link key={p.entrantId} href={`/entrants/${p.entrantId}`}>
                <Badge className="hover:text-foreground">{p.displayName}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}
    </Container>
  );
}
