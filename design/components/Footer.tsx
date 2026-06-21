import Link from "next/link";
import { Container } from "./Container";

/**
 * Footer hosts the charity CTA. Donations are intentionally NOT enforced by
 * the app (see PLAN.md) — this is just an outbound link.
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
          <Link href="/feedback" className="hover:text-foreground">
            Feedback
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </div>
      </Container>
    </footer>
  );
}
