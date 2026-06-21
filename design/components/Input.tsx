import type { InputHTMLAttributes } from "react";
import { cn } from "../utils";

/** Base text input. The Session-4 player typeahead is built on top of this. */
export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-surface-2 px-3.5 text-foreground",
        "placeholder:text-muted",
        "focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary/40",
        className,
      )}
      {...props}
    />
  );
}
