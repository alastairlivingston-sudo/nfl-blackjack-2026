"use client";

import { useActionState } from "react";
import { Button, Card, CardTitle, CardSubtitle, Input } from "@/design";
import { saveProfile, type ActionState } from "./actions";

export function ProfileForm({
  initial,
}: {
  initial?: { displayName: string; socialHandle: string | null; tagConsent: boolean };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProfile, {});

  return (
    <Card>
      <CardTitle>{initial ? "Edit your details" : "Set up your entry"}</CardTitle>
      <CardSubtitle>This is the name that shows on the public scoreboard.</CardSubtitle>

      <form action={action} className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-muted">
          Display name
          <Input
            name="displayName"
            defaultValue={initial?.displayName}
            placeholder="e.g. Al's Picks"
            required
            maxLength={60}
            className="mt-1"
          />
        </label>

        <label className="block text-sm font-medium text-muted">
          Social handle (optional)
          <Input
            name="socialHandle"
            defaultValue={initial?.socialHandle ?? ""}
            placeholder="@handle"
            className="mt-1"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            name="tagConsent"
            defaultChecked={initial?.tagConsent}
            className="h-4 w-4 rounded border-border bg-surface-2"
          />
          OK to tag my social handle if I win
        </label>

        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save changes" : "Continue"}
        </Button>
      </form>
    </Card>
  );
}
