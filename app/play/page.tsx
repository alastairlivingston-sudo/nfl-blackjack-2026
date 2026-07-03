import { Card, CardTitle, CardSubtitle, Container } from "@/design";
import { listPlaySeasons } from "@/lib/db/queries";
import { PLAY_SEASON } from "@/lib/season";
import { buildSeasonSlots } from "./roll";
import { PlayPicker } from "./PlayPicker";

// Fresh random teams on every visit (PLAN.md: "stateless v1; replayable") — never cache this page.
export const dynamic = "force-dynamic";

export default async function PlayPage() {
  // Seasons the generator can offer come straight from the data: 2025 is seeded
  // on deploy, older years appear as they're backfilled (scripts/ingest-history.ts).
  const available = await listPlaySeasons();
  const seasons = available.length > 0 ? available : [PLAY_SEASON];
  const initialSeason = seasons[0];
  const initialSlots = await buildSeasonSlots(initialSeason);

  return (
    <Container className="space-y-4 py-8">
      <Card>
        <CardTitle>21 Generator</CardTitle>
        <CardSubtitle>
          {seasons.length > 1
            ? "Pick a season, spin a team, pick a player, five times over. Totals are that year's final non-passing TDs — hidden until the big reveal."
            : "Spin a team, pick a player, five times over. Totals are final non-passing TDs — hidden until the big reveal."}
        </CardSubtitle>
      </Card>
      <PlayPicker seasons={seasons} initialSeason={initialSeason} initialSlots={initialSlots} />
    </Container>
  );
}
