import { Card, CardTitle, CardSubtitle, Container } from "@/design";
import { getTeamPlayersBare, listTeams } from "@/lib/db/queries";
import { PlayPicker, type TeamSlot } from "./PlayPicker";

// Fresh random teams on every visit (PLAN.md: "stateless v1; replayable") — never cache this page.
export const dynamic = "force-dynamic";

function pickRandomTeams(teams: string[], count: number): string[] {
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default async function PlayPage() {
  const teams = await listTeams();
  const randomTeams = pickRandomTeams(teams, 5);

  const slots: TeamSlot[] = await Promise.all(
    randomTeams.map(async (team) => ({ team, players: await getTeamPlayersBare(team) })),
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
