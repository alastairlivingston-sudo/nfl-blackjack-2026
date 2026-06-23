"use client";

import { useState } from "react";
import { Card, StatePill, type LineupState } from "@/design";
import type { Entrant2025 } from "@/lib/data/leaderboard2025";

function stateFor(e: Entrant2025): LineupState {
  if (!e.valid) return "invalid";
  if (e.total > 21) return "bust";
  if (e.total === 21) return "blackjack";
  return "short";
}

export function Leaderboard2025({ entrants }: { entrants: Entrant2025[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Card className="divide-y divide-border p-0">
      {entrants.map((e, i) => {
        const open = openIndex === i;
        return (
          <div key={`${e.name}-${i}`}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-muted">
                  {i + 1}
                </span>
                <span className="truncate font-semibold">{e.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-sm font-bold tabular-nums">{e.total} / 21</span>
                <StatePill state={stateFor(e)} />
              </div>
            </button>

            {open ? (
              <div className="space-y-2 bg-surface-2/40 px-4 pb-4 pt-1">
                {e.players.map((p, j) => (
                  <div
                    key={`${p.name}-${j}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3.5 py-2.5"
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="font-mono text-sm tabular-nums text-muted">
                      {p.tds} <span className="font-sans">TD</span>
                    </span>
                  </div>
                ))}
                <p className="pt-1 text-sm text-muted">
                  Valid lineup:{" "}
                  <span className={e.valid ? "text-success" : "text-neutral"}>
                    {e.valid ? "Yes" : "No"}
                  </span>
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
    </Card>
  );
}
