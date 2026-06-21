/**
 * Tiny className joiner. Kept dependency-free so the `design/` folder stays
 * trivially extractable into its own package later (see PLAN.md "v2").
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
