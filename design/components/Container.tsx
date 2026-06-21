import { cn } from "../utils";

/** Mobile-first single-column shell. The whole app lives inside max-w-2xl. */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-2xl px-4", className)}>{children}</div>
  );
}
