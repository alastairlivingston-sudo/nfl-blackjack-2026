import type { Metadata } from "next";
import {
  Container,
  Card,
  CardTitle,
  CardSubtitle,
  Button,
  Badge,
  PositionBadge,
  StatePill,
  ScoreMeter,
  Input,
  PlayerRow,
  type LineupState,
} from "@/design";

export const metadata: Metadata = {
  title: "Design system · Touchdown Blackjack",
};

const STATES: LineupState[] = ["invalid", "short", "blackjack", "bust"];

const SWATCHES = [
  ["background", "bg-background"],
  ["surface", "bg-surface"],
  ["surface-2", "bg-surface-2"],
  ["border", "bg-border"],
  ["primary", "bg-primary"],
  ["accent", "bg-accent"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["danger", "bg-danger"],
  ["neutral", "bg-neutral"],
] as const;

export default function DesignGallery() {
  return (
    <Container className="space-y-10 py-8">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Design system</h1>
        <p className="mt-1 text-muted">
          Live tokens and components. Rules live in{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">design/DESIGN.md</code>.
        </p>
      </header>

      <Section title="Color tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="space-y-1.5">
              <div className={`h-14 rounded-xl border border-border ${cls}`} />
              <div className="text-xs text-muted">{name}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight">Manrope Extrabold</h1>
          <h2 className="text-2xl font-bold">Heading bold</h2>
          <p className="text-foreground">Body text in foreground.</p>
          <p className="text-muted">Muted secondary text.</p>
          <p className="font-mono tabular-nums">Mono / tabular 0123456789</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Lineup states">
        <div className="flex flex-wrap gap-2">
          {STATES.map((s) => (
            <StatePill key={s} state={s} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATES.map((s, i) => (
            <Card key={s} className="flex flex-col items-center gap-2 p-4">
              <ScoreMeter total={[8, 17, 21, 24][i]} state={s} />
              <StatePill state={s} />
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-3">
          <PositionBadge position="QB" />
          <PositionBadge position="RB" />
          <PositionBadge position="WR" />
          <PositionBadge position="TE" />
          <Badge>Week 7</Badge>
          <Badge>Locked</Badge>
        </div>
      </Section>

      <Section title="Player rows">
        <div className="space-y-2">
          <PlayerRow name="Christian McCaffrey" team="SF · RB" position="RB" trailing={<Badge>6 TD</Badge>} />
          <PlayerRow name="CeeDee Lamb" team="DAL · WR" position="WR" trailing={<Badge>5 TD</Badge>} />
          <PlayerRow name="Travis Kelce" team="KC · TE" position="TE" trailing={<Button size="sm" variant="secondary">Pick</Button>} />
        </div>
      </Section>

      <Section title="Inputs">
        <div className="space-y-3">
          <Input placeholder="Search players…" />
          <Input placeholder="you@example.com" type="email" />
        </div>
      </Section>

      <Section title="Card">
        <Card>
          <CardTitle>Card title</CardTitle>
          <CardSubtitle>Supporting subtitle text.</CardSubtitle>
          <p className="mt-3 text-sm text-muted">
            Cards are <code className="rounded bg-surface-2 px-1 py-0.5">rounded-2xl</code>{" "}
            with a hairline border on the <code className="rounded bg-surface-2 px-1 py-0.5">surface</code> token.
          </p>
        </Card>
      </Section>
    </Container>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}
