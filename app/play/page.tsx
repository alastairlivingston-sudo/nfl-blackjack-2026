import { Card, CardTitle, CardSubtitle, Container } from "@/design";
import { getFinalSeasonTotals, getTeamPlayersBare, listTeams } from "@/lib/db/queries";
import { PLAY_SEASON } from "@/lib/season";
import { PlayPicker, type TeamSlot } from "./PlayPicker";

// Fresh random teams on every visit (PLAN.md: "stateless v1; replayable") — never cache this page.
export const dynamic = "force-dynamic";

function pickRandomTeams(teams: string[], count: number): string[] {
  // Fisher–Yates: a `sort(() => Math.random() - 0.5)` shuffle is biased and
  // non-uniform, so some teams would surface far more often than others.
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export default async function PlayPage() {
  const teams = await listTeams();
  const randomTeams = pickRandomTeams(teams, 5);

  // Sort each team's roster by 2025 non-passing TDs (best first) without exposing the
  // number itself — the jeopardy is choosing blind, not seeing raw totals (PLAN.md "21 Generator").
  const totals = await getFinalSeasonTotals(PLAY_SEASON);
  const slots: TeamSlot[] = await Promise.all(
    randomTeams.map(async (team) => {
      const roster = await getTeamPlayersBare(team);
      roster.sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0));
      return { team, players: roster };
    }),
  );

  return (
    <Container className="space-y-4 py-8">
      <Card>
        <CardTitle>21 Generator — 2025</CardTitle>
        <CardSubtitle>
          5 random teams, one player each. Totals are final 2025 non-passing TDs — hidden until you
          reveal.
        </CardSubtitle>
      </Card>
      <PlayPicker slots={slots} />
    </Container>
  );
}
