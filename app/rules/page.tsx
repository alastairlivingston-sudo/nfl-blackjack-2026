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
          Each player&apos;s <span className="text-foreground">non-passing touchdowns</span> (rushing,
          receiving, return and recovery) are added up across the 2026 regular season, weeks 1–18.
          Your lineup&apos;s total is the sum across all 5 players.
        </Rule>
        <Rule title="The goal">
          Get <span className="font-semibold text-foreground">exactly 21</span> for blackjack. Over 21
          busts; under and you&apos;re short.
        </Rule>
        <Rule title="Validity">
          A lineup only counts if <span className="text-foreground">every one of your 5 players scores
          at least 1 non-passing TD</span> by the end of week 18. If any player stays on zero, your
          lineup is invalid and can&apos;t win, no matter the total.
        </Rule>
        <Rule title="Winning">
          Among valid lineups, anyone who gets <span className="font-semibold text-foreground">21</span>{" "}
          wins. Ties on the leaderboard are broken by whoever submitted their lineup first.
        </Rule>
        <Rule title="If everyone busts or falls short">
          Like in 2025, when no one hit blackjack, prizes are raffled away at the end of the year.
        </Rule>
        <Rule title="One entry, one email">
          One lineup per email address. You can edit your picks as many times as you like until lock.
        </Rule>
        <Rule title="Lock">
          Entries lock the moment Week 1 kicks off. After that, lineups are frozen and revealed
          publicly on the scoreboard.
        </Rule>
        <Rule title="No donation, no prize">
          This is a free-to-enter charity game for fun and bragging rights. But to be eligible for
          prizes you&apos;ll need to donate via our{" "}
          <a
            href="https://www.justgiving.com/page/nflblackjack26"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-violet-300 hover:text-white"
          >
            JustGiving page
          </a>
          . There&apos;s no set amount — pay what you can afford; if you&apos;re able, we suggest £10
          to Petals.
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
