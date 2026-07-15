import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardTitle, CardSubtitle, Container } from "@/design";
import { getGeneratorLeaderboard, type GeneratorScoreRow } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "21 Generator Leaderboard · Touchdown Blackjack",
};

// Always show the latest times.
export const dynamic = "force-dynamic";

function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(3)}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toFixed(3).padStart(6, "0")}s`;
}

export default async function GeneratorLeaderboardPage() {
  const [easy, hard] = await Promise.all([
    getGeneratorLeaderboard("easy"),
    getGeneratorLeaderboard("hard"),
  ]);

  return (
    <Container className="space-y-4 py-8">
      <Card>
        <CardTitle>21 Generator Leaderboard</CardTitle>
        <CardSubtitle>
          Everyone who hit exactly 21, ranked by how fast they got there. Fancy your chances?{" "}
          <Link href="/play" className="font-semibold text-violet-300 hover:text-white">
            Play the generator
          </Link>
          .
        </CardSubtitle>
      </Card>

      <Board title="Easy mode" subtitle="With respins." rows={easy} />
      <Board title="Hard mode" subtitle="No respins — pure jeopardy." rows={hard} />
    </Container>
  );
}

function Board({ title, subtitle, rows }: { title: string; subtitle: string; rows: GeneratorScoreRow[] }) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <CardSubtitle>{subtitle}</CardSubtitle>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No 21s yet — be the first.</p>
      ) : (
        <ol className="mt-4 space-y-1">
          {rows.map((r, i) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm"
            >
              <span className="flex items-center gap-3">
                <span className="w-6 font-mono font-bold tabular-nums text-muted">{i + 1}</span>
                <span className="font-semibold text-foreground">{r.name}</span>
              </span>
              <span className="font-mono font-bold tabular-nums text-foreground">{formatTime(r.durationMs)}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
