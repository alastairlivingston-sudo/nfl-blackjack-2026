import { Card, CardTitle, CardSubtitle, Container } from "@/design";

export default function PrivacyPage() {
  return (
    <Container className="py-8">
      <Card>
        <CardTitle>Privacy</CardTitle>
        <CardSubtitle>What we collect and why.</CardSubtitle>
        <div className="mt-4 space-y-3 text-sm text-muted">
          <p>
            We store your email (for magic-link sign-in), the display name and optional social
            handle you enter, and your 5 player picks. Your email is never shown publicly — only
            your display name appears on the scoreboard.
          </p>
          <p>
            If you opt in to tagging, we may mention your social handle if you win. Feedback you
            submit is stored along with your email (if signed in) and the page you sent it from,
            so we can follow up if needed.
          </p>
          <p>We don&apos;t sell or share your data, and don&apos;t use it for anything beyond running this game.</p>
        </div>
      </Card>
    </Container>
  );
}
