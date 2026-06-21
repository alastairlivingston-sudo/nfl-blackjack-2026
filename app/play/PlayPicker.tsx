"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardTitle, CardSubtitle, PlayerRow, ScoreMeter, StatePill } from "@/design";
import { revealPlayLineup, type RevealState } from "./actions";
import type { BarePlayer } from "@/lib/db/queries";

export interface TeamSlot {
  team: string;
  players: BarePlayer[];
}

export function PlayPicker({ slots }: { slots: TeamSlot[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RevealState | null>(null);
  const [pending, startTransition] = useTransition();

  const allPicked = slots.every((s) => selected[s.team]);

  function handleReveal() {
    setResult(null);
    startTransition(async () => {
      const playerIds = slots.map((s) => selected[s.team]);
      setResult(await revealPlayLineup(playerIds));
    });
  }

  if (result?.players && result.scored) {
    return (
      <Card>
        <CardTitle>Reveal</CardTitle>
        <CardSubtitle>Final 2025 non-passing TDs.</CardSubtitle>

        <div className="mt-4 space-y-2">
          {result.players.map((p) => (
            <PlayerRow
              key={p.playerId}
              name={p.fullName}
              team={p.team ?? "FA"}
              position={p.position}
              trailing={<span className="font-semibold">{p.nonPassingTd} TD</span>}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <ScoreMeter total={result.scored.totalTd} state={result.scored.state} />
          <StatePill state={result.scored.state} />
        </div>

        <Button className="mt-4" variant="secondary" onClick={() => router.refresh()}>
          Play again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {slots.map((slot) => (
        <Card key={slot.team}>
          <CardTitle>{slot.team}</CardTitle>
          <div className="mt-3 space-y-2">
            {slot.players.map((p) => (
              <button
                key={p.id}
                type="button"
                className="block w-full text-left"
                onClick={() => setSelected((prev) => ({ ...prev, [slot.team]: p.id }))}
              >
                <PlayerRow
                  name={p.fullName}
                  team={slot.team}
                  position={p.position}
                  className={selected[slot.team] === p.id ? "border-primary" : undefined}
                />
              </button>
            ))}
          </div>
        </Card>
      ))}

      {result?.error ? <p className="text-sm text-danger">{result.error}</p> : null}

      <Button disabled={!allPicked || pending} onClick={handleReveal}>
        {pending ? "Revealing…" : "Reveal"}
      </Button>
    </div>
  );
}
