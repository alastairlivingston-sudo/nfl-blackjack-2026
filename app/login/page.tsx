import { Button, Card, CardTitle, CardSubtitle, Container } from "@/design";
import { signInWithGoogle } from "./actions";

export default function LoginPage() {
  return (
    <Container className="py-8">
      <Card>
        <CardTitle>Sign in</CardTitle>
        <CardSubtitle>Sign in with Google to enter your lineup.</CardSubtitle>

        <form action={signInWithGoogle} className="mt-4">
          <Button type="submit" className="w-full">
            Sign in with Google
          </Button>
        </form>
      </Card>
    </Container>
  );
}
