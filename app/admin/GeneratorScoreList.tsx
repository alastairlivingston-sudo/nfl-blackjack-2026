"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/design";
import type { GeneratorScoreRow } from "@/lib/db/queries";
import { removeGeneratorScore } from "./actions";

function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(3)}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s.toFixed(3).padStart(6, "0")}s`;
}

/**
 * Admin control to delete individual 21 Generator runs. Two-tap confirm
 * (Remove -> Confirm) instead of window.confirm so it's reliable on mobile,
 * and it surfaces pending/error state visibly rather than in a tooltip.
 */
export function GeneratorScoreList({ rows }: { rows: GeneratorScoreRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-muted">No runs yet.</p>;
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await removeGeneratorScore(id);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setConfirmingId(null);
        router.refresh();
      } catch {
        setError("Couldn't remove that run — try again.");
      }
    });
  }

  return (
    <div className="mt-3 space-y-2">
      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
      {rows.map((r, i) => (
        <div
          key={r.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="w-6 font-mono font-bold tabular-nums text-muted">{i + 1}</span>
            <span className="truncate font-semibold text-foreground">{r.name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="font-mono font-bold tabular-nums text-foreground">{formatTime(r.durationMs)}</span>
            {confirmingId === r.id ? (
              <span className="flex items-center gap-2">
                <Button variant="danger" size="sm" disabled={pending} onClick={() => remove(r.id)}>
                  {pending ? "Removing…" : "Confirm"}
                </Button>
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirmingId(null)}>
                  Cancel
                </Button>
              </span>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="text-danger"
                onClick={() => {
                  setError(null);
                  setConfirmingId(r.id);
                }}
              >
                Remove
              </Button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
