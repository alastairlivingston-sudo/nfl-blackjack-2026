import { Button, Card, CardTitle, CardSubtitle, Container } from "@/design";
import { signInWithGoogle } from "./actions";
import { EmailLoginForm } from "./EmailLoginForm";

// The magic-link form is only useful if email delivery is configured; with
// Google sign-in as the primary path most deployments need no email at all.
const emailConfigured = Boolean(process.env.EMAIL_SERVER_HOST || process.env.AUTH_RESEND_KEY);
const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID);

export default function LoginPage() {
  return (
    <Container className="py-8">
      <Card>
        <CardTitle>Sign in</CardTitle>
        <CardSubtitle>Use your Google account — no password to remember.</CardSubtitle>

        <div className="mt-4 space-y-4">
          {googleConfigured ? (
            <form action={signInWithGoogle}>
              <Button type="submit" className="w-full">
                Continue with Google
              </Button>
            </form>
          ) : null}

          {googleConfigured && emailConfigured ? (
            <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
          ) : null}

          {emailConfigured ? <EmailLoginForm /> : null}
        </div>
      </Card>
    </Container>
  );
}
