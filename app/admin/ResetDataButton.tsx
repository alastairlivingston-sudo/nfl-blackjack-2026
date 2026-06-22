"use client";

import { useActionState } from "react";
import { Button, Input } from "@/design";
import { resetGameDataAction, type ResetState } from "./actions";

export function ResetDataButton() {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetGameDataAction, {});

  return (
    <form action={action} className="space-y-2">
      <label className="block text-sm font-medium text-muted">
        Type RESET to confirm
        <Input name="confirm" placeholder="RESET" className="mt-1" autoComplete="off" />
      </label>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.done ? <p className="text-sm text-success">Game data cleared.</p> : null}
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Clearing…" : "Clear all entrants & picks"}
      </Button>
    </form>
  );
}
