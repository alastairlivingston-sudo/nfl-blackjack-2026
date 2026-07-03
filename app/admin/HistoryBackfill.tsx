"use client";

import { useState } from "react";
import { Button } from "@/design";
import { ingestPastSeason } from "./actions";

/**
 * Admin control to load past seasons into the multi-year 21 Generator. One
 * season per click (each runs the Sleeper backfill server-side within the 60s
 * budget); already-loaded seasons show a badge. Idempotent, so re-clicking a
 * season that timed out just resumes it.
 */
export function HistoryBackfill({ seasons, loadedInitial }: { seasons: number[]; loadedInitial: number[] }) {
  const [loaded, setLoaded] = useState<Set<number>>(new Set(loadedInitial));
  const [running, setRunning] = useState<number | null>(null);
  const [message, setMessage] = useState<string | undefined>();

  async function load(season: number) {
    setRunning(season);
    setMessage(undefined);
    const res = await ingestPastSeason(season);
    setRunning(null);
    if (res.error) {
      setMessage(`${season}: ${res.error}`);
    } else {
      setLoaded((prev) => new Set(prev).add(season));
      setMessage(`${season}: ${res.players} players, ${res.teams} teams loaded.`);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {seasons.map((s) => {
          const isLoaded = loaded.has(s);
          return (
            <Button key={s} variant="secondary" disabled={running !== null} onClick={() => load(s)}>
              {running === s ? `Loading ${s}…` : isLoaded ? `✓ ${s} (reload)` : `Load ${s}`}
            </Button>
          );
        })}
      </div>
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </div>
  );
}
