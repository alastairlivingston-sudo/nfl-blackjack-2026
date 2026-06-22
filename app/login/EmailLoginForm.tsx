"use client";

import { useActionState } from "react";
import { Button, Input } from "@/design";
import { sendMagicLink, type LoginState } from "./actions";

export function EmailLoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {});

  return (
    <form action={action} className="space-y-3">
      <Input type="email" name="email" placeholder="you@example.com" required />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Email me a magic link"}
      </Button>
    </form>
  );
}
