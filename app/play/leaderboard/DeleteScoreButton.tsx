"use client";

import { useState, useTransition } from "react";
import { removeGeneratorScore } from "./actions";

/** Admin-only control to remove a single run from the board (see actions.ts). */
export function DeleteScoreButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleClick() {
    if (!window.confirm(`Remove ${name}'s time from the leaderboard?`)) return;
    setError(undefined);
    startTransition(async () => {
      const result = await removeGeneratorScore(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title={error ?? `Remove ${name}`}
      aria-label={`Remove ${name} from the leaderboard`}
      className="rounded-lg border border-border px-2 py-1 text-xs font-semibold text-danger transition hover:bg-surface disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
