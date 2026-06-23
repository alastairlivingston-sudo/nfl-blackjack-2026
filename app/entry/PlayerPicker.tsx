"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, Card, CardTitle, CardSubtitle, Input, PlayerRow } from "@/design";
import { saveLineup } from "./actions";

interface PlayerOption {
  id: string;
  fullName: string;
  team: string | null;
  position: string;
  searchName: string;
}

export function PlayerPicker({ initialPlayerIds }: { initialPlayerIds: string[] }) {
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selected, setSelected] = useState<PlayerOption[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/players.json")
      .then((res) => res.json())
      .then((all: PlayerOption[]) => {
        setPlayers(all);
        if (initialPlayerIds.length > 0) {
          const byId = new Map(all.map((p) => [p.id, p]));
          setSelected(initialPlayerIds.map((id) => byId.get(id)).filter((p): p is PlayerOption => !!p));
        }
      });
    // initialPlayerIds is the entrant's saved lineup, fixed for this component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map((p) => p.id)), [selected]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return players.filter((p) => !selectedIds.has(p.id) && p.searchName.includes(q)).slice(0, 8);
  }, [players, query, selectedIds]);

  function addPlayer(player: PlayerOption) {
    if (selected.length >= 5) return;
    setSelected((prev) => [...prev, player]);
    setQuery("");
  }

  function removePlayer(id: string) {
    setSelected((prev) => prev.filter((p) => p.id !== id));
  }

  function handleSubmit() {
    setError(undefined);
    setSaved(false);
    startTransition(async () => {
      const result = await saveLineup(selected.map((p) => p.id));
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <Card>
      <CardTitle>Your lineup</CardTitle>
      <CardSubtitle>Pick exactly 5 players. Hit exactly 21 non-passing TDs for blackjack.</CardSubtitle>

      <div className="mt-4 space-y-2">
        {selected.map((p) => (
          <PlayerRow
            key={p.id}
            name={p.fullName}
            team={p.team ?? "FA"}
            position={p.position}
            trailing={
              <Button variant="ghost" size="sm" onClick={() => removePlayer(p.id)}>
                Remove
              </Button>
            }
          />
        ))}
      </div>

      {selected.length < 5 ? (
        <div className="relative mt-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players…"
          />
          {results.length > 0 ? (
            <div className="absolute z-10 mt-1 w-full space-y-1 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
              {results.map((p) => (
                <button key={p.id} type="button" className="block w-full text-left" onClick={() => addPlayer(p)}>
                  <PlayerRow name={p.fullName} team={p.team ?? "FA"} position={p.position} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-success">Lineup saved.</p> : null}

      <Button className="mt-4" disabled={selected.length !== 5 || pending} onClick={handleSubmit}>
        {pending ? "Saving…" : "Save lineup"}
      </Button>
    </Card>
  );
}
