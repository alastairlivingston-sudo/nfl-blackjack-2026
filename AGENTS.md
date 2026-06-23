<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Touchdown Blackjack

The build contract lives in **`PLAN.md`** (game rules, scoring engine, data model,
session breakdown). Read it before making product decisions.

## Design system — read `design/DESIGN.md`
- **Always import UI from `@/design`.** Never reach into `design/components/*` directly,
  and don't hand-roll one-off components that duplicate what's already there.
- **Use design tokens, not raw colours.** `bg-surface`, `text-muted`, `border-border`,
  `text-success/warning/danger/neutral`, etc. No new hex values; extend `design/theme.css`
  if a token is genuinely missing.
- **Dark only, mobile-first.** No light theme / `dark:` variants. Page content sits inside
  `<Container>` (`max-w-2xl`). Cards `rounded-2xl`, controls `rounded-xl`.
- Lineup-state colour mapping is canonical: `invalid→neutral`, `short→warning`,
  `blackjack→success`, `bust→danger`.
- The live gallery is at route **`/design`**.
