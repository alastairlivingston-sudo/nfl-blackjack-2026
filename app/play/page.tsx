import { Card, CardTitle, CardSubtitle, Container } from "@/design";
import { getAllPlayTeamRosters, getFinalSeasonTotals } from "@/lib/db/queries";
import { PLAY_SEASON } from "@/lib/season";
import { PlayPicker, type TeamSlot } from "./PlayPicker";

// Fresh random teams on every visit (PLAN.md: "stateless v1; replayable") — never cache this page.
export const dynamic = "force-dynamic";

function shuffle<T>(items: T[]): T[] {
  // Fisher–Yates: a `sort(() => Math.random() - 0.5)` shuffle is biased and
  // non-uniform, so some items would surface far more often than others.
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default async function PlayPage() {
  const [rostersByTeam, totals] = await Promise.all([getAllPlayTeamRosters(), getFinalSeasonTotals(PLAY_SEASON)]);
  const teams = shuffle([...rostersByTeam.keys()]);

  // Only players who actually scored a non-passing TD in 2025 are pickable —
  // a guaranteed-zero pick is a dead end, not a real choice. Sort best-first
  // by that hidden total so the jeopardy is choosing blind, not seeing it.
  const slots: TeamSlot[] = [];
  for (const team of teams) {
    if (slots.length === 5) break;
    const roster = (rostersByTeam.get(team) ?? []).filter((p) => (totals.get(p.id) ?? 0) > 0);
    if (roster.length === 0) continue;
    roster.sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0));
    slots.push({ team, players: roster });
  }

  return (
    <Container className="space-y-4 py-8">
      <Card>
        <CardTitle>21 Generator — 2025</CardTitle>
        <CardSubtitle>
          Spin a team, pick a player, five times over. Totals are final 2025 non-passing TDs —
          hidden until the big reveal.
        </CardSubtitle>
      </Card>
      <PlayPicker slots={slots} />
    </Container>
  );
}
