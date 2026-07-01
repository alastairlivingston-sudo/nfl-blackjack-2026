import { cn } from "../utils";

/** The four lineup states from the scoring engine (see PLAN.md). */
export type LineupState = "invalid" | "short" | "blackjack" | "bust";

/** Canonical state->colour mapping (see AGENTS.md); exported so tests can assert it stays exhaustive. */
export const STATE_STYLES: Record<LineupState, { label: string; className: string }> = {
  invalid: { label: "Invalid", className: "border-neutral/30 bg-neutral/15 text-neutral" },
  short: { label: "Short", className: "border-warning/30 bg-warning/15 text-warning" },
  blackjack: { label: "Blackjack", className: "border-success/30 bg-success/15 text-success" },
  bust: { label: "Bust", className: "border-danger/30 bg-danger/15 text-danger" },
};

const styles = STATE_STYLES;

export function StatePill({
  state,
  className,
}: {
  state: LineupState;
  className?: string;
}) {
  const s = styles[state];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide",
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  );
}
