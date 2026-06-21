import { cn } from "../utils";
import { PositionBadge } from "./Badge";

/** One player line — used in lineups, the scoreboard, and typeahead results. */
export function PlayerRow({
  name,
  team,
  position,
  trailing,
  className,
}: {
  name: string;
  team: string;
  position: string;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3.5 py-2.5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <PositionBadge position={position} />
        <div className="min-w-0 leading-tight">
          <div className="truncate font-semibold">{name}</div>
          <div className="text-xs text-muted">{team}</div>
        </div>
      </div>
      {trailing ? <div className="shrink-0 pl-3">{trailing}</div> : null}
    </div>
  );
}
