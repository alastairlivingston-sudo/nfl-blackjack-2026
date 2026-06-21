import { cn } from "../utils";
import type { LineupState } from "./StatePill";

const color: Record<LineupState, string> = {
  invalid: "text-neutral",
  short: "text-warning",
  blackjack: "text-success",
  bust: "text-danger",
};

/** Big "total / 21" readout, coloured by lineup state. */
export function ScoreMeter({
  total,
  state,
  className,
}: {
  total: number;
  state: LineupState;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-1.5", className)}>
      <span className={cn("text-4xl font-extrabold tabular-nums", color[state])}>
        {total}
      </span>
      <span className="text-xl font-semibold text-muted">/ 21</span>
    </div>
  );
}
