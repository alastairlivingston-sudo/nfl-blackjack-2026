import type { Metadata } from "next";
import { Card, CardTitle, CardSubtitle, Container } from "@/design";

export const metadata: Metadata = {
  title: "Rules · Touchdown Blackjack",
};

export default function RulesPage() {
  return (
    <Container className="space-y-4 py-8">
      <Card>
        <CardTitle>Rules</CardTitle>
        <CardSubtitle>How Touchdown Blackjack is scored and decided.</CardSubtitle>
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
          You have to land on <span className="font-semibold text-foreground">exactly 21</span> to win
          — closest-to-21 does not win. Among valid lineups, anyone whose total is exactly 21 wins;
          anything under (short) or over (bust) cannot. Ties between 21s are broken by whoever
          submitted their lineup first.
        </Rule>
        <Rule title="If everyone busts or falls short">
          Like in 2025, when no one hit blackjack, the prizes are given away by random draw at the
          end of the year.
        </Rule>
        <Rule title="One entry, one email">
          One lineup per email address. You can edit your picks as many times as you like until lock.
        </Rule>
        <Rule title="Lock">
          Entries lock the moment Week 1 kicks off. After that, lineups are frozen and revealed
          publicly on the scoreboard.
        </Rule>
        <Rule title="18 and over">
          You must be 18 or over to enter.
        </Rule>
        <Rule title="Playing for Petals">
          This is a free-to-enter charity game for fun, bragging rights and of course some prizes
          too. But the most important thing for us is to raise money so Petals can continue to do the
          amazing work they do! Please donate via our{" "}
          <a
            href="https://www.justgiving.com/page/nflblackjack26"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-violet-300 hover:text-white"
          >
            JustGiving page
          </a>
          . There&apos;s no set amount — pay what you can afford; if you&apos;re able, we suggest a
          £10 donation. Donating is optional and doesn&apos;t affect your entry or your chance of
          winning.
        </Rule>
        <Rule title="Player eligibility / corrections">
          We score off third-party NFL stats feeds. If a stat gets corrected upstream after the fact,
          the leaderboard updates to match — we don&apos;t freeze incorrect numbers in place.
        </Rule>
        <Rule title="Not affiliated with the NFL">
          Touchdown Blackjack is an independent charity game, not affiliated with, endorsed by, or
          sponsored by the National Football League. NFL, team, and player names are trademarks of
          their respective owners and are used here for identification only.
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
