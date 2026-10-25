"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card, CardSubtitle, CardTitle, Input, PlayerRow } from "@/design";
import type { PickedPlayer } from "@/lib/db/queries";

/** Shown before anything is typed — the most-picked players. */
const POPULAR_COUNT = 5;
const MAX_RESULTS = 10;

/**
 * Client-side filter over every picked player (same substring match on
 * `searchName` as the entry typeahead — no fuzzy matching). Each result lists
 * the entrants who picked that player, linking to their lineups.
 */
export function PlayerSearch({ players }: { players: PickedPlayer[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      q
        ? players.filter((p) => p.searchName.includes(q)).slice(0, MAX_RESULTS)
        : players.slice(0, POPULAR_COUNT),
    [players, q],
  );

  return (
    <div className="space-y-4">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a player, e.g. McCaffrey"
        aria-label="Search players"
        autoComplete="off"
      />

      {!q ? (
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">Most picked</p>
      ) : null}

      {results.length === 0 ? (
        <Card>
          <CardTitle>Nobody picked that player</CardTitle>
          <CardSubtitle>
            No entrant has a player matching “{query.trim()}” in their lineup.
          </CardSubtitle>
        </Card>
      ) : (
        results.map((p) => (
          <Card key={p.id} className="space-y-3">
            <Link href={`/players/${p.id}`} className="block">
              <PlayerRow
                name={p.fullName}
                team={p.team ?? "Free agent"}
                position={p.position}
                className="hover:bg-surface"
                trailing={
                  <span className="font-mono text-sm font-bold tabular-nums">
                    {p.seasonTotal} TD
                  </span>
                }
              />
            </Link>
            <p className="text-sm text-muted">
              Picked by {p.pickers.length} {p.pickers.length === 1 ? "entrant" : "entrants"}
            </p>
            <div className="flex flex-wrap gap-2">
              {p.pickers.map((e) => (
                <Link key={e.entrantId} href={`/entrants/${e.entrantId}`}>
                  <Badge className="hover:text-foreground">{e.displayName}</Badge>
                </Link>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
