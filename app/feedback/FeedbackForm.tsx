"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { Button, Card, CardTitle, CardSubtitle } from "@/design";
import { submitFeedback, type FeedbackState } from "./actions";

export function FeedbackForm() {
  const pathname = usePathname();
  const [state, action, pending] = useActionState<FeedbackState, FormData>(submitFeedback, {});

  return (
    <Card>
      <CardTitle>Send feedback</CardTitle>
      <CardSubtitle>Found a bug, or have an idea? Tell us — fixes ship in later updates.</CardSubtitle>

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="context" value={pathname} />
        <textarea
          name="message"
          required
          maxLength={2000}
          rows={4}
          placeholder="What's going on?"
          className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-foreground placeholder:text-muted focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary/40"
        />

        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        {state.sent ? <p className="text-sm text-success">Thanks — got it.</p> : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send feedback"}
        </Button>
      </form>
    </Card>
  );
}
