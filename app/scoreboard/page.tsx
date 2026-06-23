import type { Metadata } from "next";
import Link from "next/link";
import { Container, Card, CardTitle, CardSubtitle, StatePill, Badge, type LineupState } from "@/design";
import { getEnteredEntrants, getScoreboard } from "@/lib/db/queries";
import { isLocked } from "@/lib/lock";

export const metadata: Metadata = {
  title: "Scoreboard · Touchdown Blackjack",
};

// Leaderboard is precomputed by the daily cron; ISR keeps reads off the DB
// for concurrent viewers (see PLAN.md "Scalability for ~1,000 users").
export const revalidate = 60;

export default async function ScoreboardPage() {
  const locked = isLocked();
  // Pre-lock reads entrants directly (so a fresh submission shows immediately);
  // post-lock reads the precomputed leaderboard for totals/state/rank.
  const rows = locked ? await getScoreboard() : [];
  const entered = locked ? [] : await getEnteredEntrants();
  const count = locked ? rows.length : entered.length;

  return (
    <Container className="space-y-6 py-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-300">
          2026 Season
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Scoreboard</h1>
        <p className="mt-2 text-muted">
          {locked
            ? "Lineups are locked — totals update once a day."
            : "Lineups stay private until Week 1 kickoff. Entrants below have submitted; totals and picks reveal at lock."}
        </p>
      </header>

      {count === 0 ? (
        <Card>
          <CardTitle>No entrants yet</CardTitle>
          <CardSubtitle>Come back once entries open.</CardSubtitle>
        </Card>
      ) : locked ? (
        <Card className="divide-y divide-border p-0">
          {rows.map((row, i) => (
            <ScoreboardRow key={row.entrantId} row={row} locked position={i + 1} />
          ))}
        </Card>
      ) : (
        <Card className="divide-y divide-border p-0">
          {entered.map((row, i) => (
            <div key={row.entrantId} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-muted">
                  {i + 1}
                </span>
                <span className="truncate font-semibold">{row.displayName}</span>
              </div>
              <Badge>Entered</Badge>
            </div>
          ))}
        </Card>
      )}
    </Container>
  );
}

function ScoreboardRow({
  row,
  locked,
  position,
}: {
  row: Awaited<ReturnType<typeof getScoreboard>>[number];
  locked: boolean;
  position: number;
}) {
  const content = (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-muted">
          {locked && row.rank ? row.rank : position}
        </span>
        <span className="truncate font-semibold">{row.displayName}</span>
      </div>
      {locked ? (
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-sm font-bold tabular-nums">{row.totalTd} / 21</span>
          <StatePill state={row.state as LineupState} />
        </div>
      ) : (
        <Badge>Entered</Badge>
      )}
    </div>
  );

  if (!locked) return content;

  return (
    <Link href={`/entrants/${row.entrantId}`} className="block hover:bg-white/5">
      {content}
    </Link>
  );
}
