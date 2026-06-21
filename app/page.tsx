import Link from "next/link";
import {
  Container,
  Card,
  CardTitle,
  CardSubtitle,
  Button,
  PlayerRow,
  ScoreMeter,
  StatePill,
} from "@/design";

/**
 * Session-0 landing page. It is a real, themed placeholder that doubles as a
 * showcase of the design system — the live scoreboard / entry flow arrive in
 * later sessions.
 */
export default function Home() {
  return (
    <Container className="py-8">
      {/* Hero */}
      <section className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-300">
          2026 Season
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Pick 5. Chase <span className="text-violet-300">21</span>. Don&apos;t bust.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Draft five NFL players and add up their non-passing touchdowns across
          weeks 1&ndash;18. Land on 21 for blackjack &mdash; go over and you&apos;re out.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button size="lg" disabled>
            Enter (soon)
          </Button>
          <Link href="/scoreboard">
            <Button size="lg" variant="secondary">
              View scoreboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Example scored lineup — showcases the components */}
      <Card className="mt-10">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Example lineup</CardTitle>
            <CardSubtitle>How a scored entry looks</CardSubtitle>
          </div>
          <StatePill state="blackjack" />
        </div>

        <div className="mt-4 space-y-2">
          <PlayerRow name="Christian McCaffrey" team="SF · RB" position="RB" trailing={<Tds n={6} />} />
          <PlayerRow name="CeeDee Lamb" team="DAL · WR" position="WR" trailing={<Tds n={5} />} />
          <PlayerRow name="Travis Kelce" team="KC · TE" position="TE" trailing={<Tds n={4} />} />
          <PlayerRow name="Jalen Hurts" team="PHI · QB" position="QB" trailing={<Tds n={3} />} />
          <PlayerRow name="Bijan Robinson" team="ATL · RB" position="RB" trailing={<Tds n={3} />} />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted">Total non-passing TDs</span>
          <ScoreMeter total={21} state="blackjack" />
        </div>
      </Card>

      {/* Rules */}
      <Card className="mt-6">
        <CardTitle>How it works</CardTitle>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>• Pick exactly 5 players before Week 1 kicks off.</li>
          <li>• Score = their combined rushing + receiving TDs, weeks 1&ndash;18.</li>
          <li>• Every player must score at least one, or the lineup is invalid.</li>
          <li>• Closest to 21 without going over wins — ties go to the earliest entry.</li>
        </ul>
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
