"use client";

import { useActionState } from "react";
import { Button, Card, CardTitle, CardSubtitle, Container, Input } from "@/design";
import { sendMagicLink, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {});

  return (
    <Container className="py-8">
      <Card>
        <CardTitle>Sign in</CardTitle>
        <CardSubtitle>We&apos;ll email you a link — no password needed.</CardSubtitle>

        <form action={action} className="mt-4 space-y-3">
          <Input type="email" name="email" placeholder="you@example.com" required autoFocus />
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Sending…" : "Send magic link"}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
