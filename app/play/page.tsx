import { Card, CardTitle, CardSubtitle, Container } from "@/design";
import { listPlaySeasons } from "@/lib/db/queries";
import { buildRandomBoard } from "./roll";
import { PlayPicker } from "./PlayPicker";

// Fresh random teams/years on every visit (PLAN.md: "stateless v1; replayable") — never cache this page.
export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const [initialSlots, seasons] = await Promise.all([buildRandomBoard(), listPlaySeasons()]);

  return (
    <Container className="space-y-4 py-8">
      <Card>
        <CardTitle>21 Generator</CardTitle>
        <CardSubtitle>
          Spin a random team and year, pick a player, five times over. Totals are that year&apos;s
          final non-passing TDs — hidden until the big reveal.
        </CardSubtitle>
      </Card>
      <PlayPicker initialSlots={initialSlots} multiSeason={seasons.length > 1} />
    </Container>
  );
}
