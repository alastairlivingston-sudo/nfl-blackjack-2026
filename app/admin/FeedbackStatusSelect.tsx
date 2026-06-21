"use client";

import { useTransition } from "react";
import type { FeedbackStatus } from "@/lib/db/queries";
import { updateFeedbackStatus } from "./actions";

const STATUSES: FeedbackStatus[] = ["new", "triaged", "done"];

export function FeedbackStatusSelect({ id, status }: { id: string; status: FeedbackStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => startTransition(() => updateFeedbackStatus(id, e.target.value as FeedbackStatus))}
      className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-foreground"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
