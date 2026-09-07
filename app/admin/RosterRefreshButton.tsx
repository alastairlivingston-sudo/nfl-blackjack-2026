"use client";

import { useState, useTransition } from "react";
import { Button } from "@/design";
import { refreshRosterNow } from "./actions";

export function RosterRefreshButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | undefined>();

  function handleClick() {
    setMessage(undefined);
    startTransition(async () => {
      const result = await refreshRosterNow();
      if (result.error) {
        setMessage(result.error);
        return;
      }
      const picked = result.pickedDeactivated ?? [];
      setMessage(
        `${result.rostered} players rostered — ${result.added} added, ${result.deactivated} no longer on a roster.` +
          (picked.length > 0
            ? ` In saved lineups: ${picked.map((p) => p.fullName).join(", ")} — their picks still count.`
            : ""),
      );
    });
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={pending}>
        {pending ? "Refreshing…" : "Refresh rosters now"}
      </Button>
      {message ? <p className="mt-2 text-sm text-muted">{message}</p> : null}
    </div>
  );
}
