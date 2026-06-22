import type { Metadata } from "next";
import { Card, CardTitle, CardSubtitle, Container } from "@/design";

export const metadata: Metadata = {
  title: "Rules · NFL Blackjack 2026",
};

export default function RulesPage() {
  return (
    <Container className="space-y-4 py-8">
      <Card>
        <CardTitle>Rules</CardTitle>
        <CardSubtitle>How NFL Blackjack 2026 is scored and decided.</CardSubtitle>
      </Card>

      <Card className="space-y-4 text-sm text-muted">
        <Rule title="The pick">
          Pick exactly 5 distinct NFL players (active QB/RB/WR/TE). The same player can be picked by
          multiple entrants — it&apos;s not a draft.
        </Rule>
        <Rule title="The score">
          Each player&apos;s <span className="text-foreground">non-passing touchdowns</span> (rushing +
          receiving) are added up across the 2026 regular season, weeks 1–18. Your lineup&apos;s total
          is the sum across all 5 players.
        </Rule>
        <Rule title="The goal">
          Get as close to <span className="font-semibold text-foreground">21</span> as possible without
          going over. Exactly 21 is blackjack. Over 21 busts.
        </Rule>
        <Rule title="Validity">
          A lineup only counts if <span className="text-foreground">every one of your 5 players scores
          at least 1 non-passing TD</span> by the end of week 18. If any player stays on zero, your
          lineup is invalid and can&apos;t win, no matter the total.
        </Rule>
        <Rule title="Winning">
          Among valid lineups, the highest total that&apos;s 21 or under wins. Ties are broken by
          whoever submitted their lineup first.
        </Rule>
        <Rule title="If everyone busts">
          If every valid lineup goes over 21, the lowest total above 21 wins instead — closest from
          the other side. Same tie-break.
        </Rule>
        <Rule title="One entry, one email">
          One lineup per email address. You can edit your picks as many times as you like until lock.
        </Rule>
        <Rule title="Lock">
          Entries lock the moment Week 1 kicks off. After that, lineups are frozen and revealed
          publicly on the scoreboard.
        </Rule>
        <Rule title="No purchase, no prize money">
          This is a free-to-enter charity game for fun and bragging rights. There&apos;s no entry fee
          and no cash prize. Any donations via the JustGiving link are entirely optional and have no
          bearing on the game.
        </Rule>
        <Rule title="Player eligibility / corrections">
          We score off third-party NFL stats feeds. If a stat gets corrected upstream after the fact,
          the leaderboard updates to match — we don&apos;t freeze incorrect numbers in place.
        </Rule>
      </Card>
    </Container>
  );
}

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}
