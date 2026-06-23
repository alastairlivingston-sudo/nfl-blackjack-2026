import { Button, Card, CardTitle, CardSubtitle, Container } from "@/design";
import { signInWithGoogle } from "./actions";

function GoogleLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.61Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A8.59 8.59 0 0 0 9 0 9 9 0 0 0 .96 4.96l2.99 2.34C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Container className="py-8">
      <Card>
        <CardTitle>Sign in</CardTitle>
        <CardSubtitle>Use your Google account — no password to remember.</CardSubtitle>

        <form action={signInWithGoogle} className="mt-4">
          <Button type="submit" variant="secondary" className="w-full">
            <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-white">
              <GoogleLogo />
            </span>
            Continue with Google
          </Button>
        </form>
      </Card>
    </Container>
  );
}
