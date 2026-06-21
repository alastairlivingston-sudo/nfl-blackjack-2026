"use client";

import { useState, useTransition } from "react";
import { Button } from "@/design";
import { refreshNow } from "./actions";

export function RefreshButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | undefined>();

  function handleClick() {
    setMessage(undefined);
    startTransition(async () => {
      const result = await refreshNow();
      setMessage(result.error ?? `Refreshed — ${result.entrantCount} entrants scored.`);
    });
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={pending}>
        {pending ? "Refreshing…" : "Refresh stats now"}
      </Button>
      {message ? <p className="mt-2 text-sm text-muted">{message}</p> : null}
    </div>
  );
}
