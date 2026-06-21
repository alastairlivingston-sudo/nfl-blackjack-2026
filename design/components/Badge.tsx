import { cn } from "../utils";

/** Generic pill label. */
export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

const positionColor: Record<string, string> = {
  QB: "bg-rose-500/15 text-rose-300",
  RB: "bg-emerald-500/15 text-emerald-300",
  WR: "bg-sky-500/15 text-sky-300",
  TE: "bg-amber-500/15 text-amber-300",
};

/** Fixed-width position chip used in player rows / typeahead results. */
export function PositionBadge({
  position,
  className,
}: {
  position: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid h-7 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold",
        positionColor[position] ?? "bg-white/10 text-muted",
        className,
      )}
    >
      {position}
    </span>
  );
}
