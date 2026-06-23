import Link from "next/link";
import { Container } from "./Container";

/**
 * Footer hosts the charity CTA. Donations are optional and never gate entry or
 * prizes (see PLAN.md) — this is just an outbound link. Also carries the
 * NFL non-affiliation disclaimer.
 */
export function Footer({ justGivingUrl }: { justGivingUrl?: string }) {
  return (
    <footer className="mt-16 border-t border-border py-8 text-sm text-muted">
      <Container className="flex flex-col items-center gap-2 text-center">
        <p>
          A charity game · 5 players · chase{" "}
          <span className="font-semibold text-foreground">21</span> non-passing TDs
        </p>
        {justGivingUrl ? (
          <a
            href={justGivingUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-violet-300 hover:text-white"
          >
            Donate on JustGiving →
          </a>
        ) : null}
        <div className="flex items-center gap-4">
          <Link href="/rules" className="hover:text-foreground">
            Rules
          </Link>
          <Link href="/feedback" className="hover:text-foreground">
            Feedback
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </div>
        <p className="max-w-prose text-xs text-muted/70">
          Touchdown Blackjack is an independent charity game, not affiliated with, endorsed by, or
          sponsored by the National Football League. NFL, team, and player names are trademarks of
          their respective owners, used for identification only.
        </p>
      </Container>
    </footer>
  );
}
