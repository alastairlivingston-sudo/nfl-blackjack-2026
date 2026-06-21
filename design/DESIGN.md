# NFL Blackjack 2026 — Design System

Dark-only, violet, mobile-first. This `design/` folder is **self-contained and
extractable**: tokens live in `theme.css`, components in `components/`, and the
public surface is `index.ts`. Extracting it into its own public package later is
a copy — not a rewrite (see `PLAN.md`).

## Non-negotiable rules
1. **Import only from `@/design`.** Never reach into `design/components/*` directly.
2. **Use tokens, not raw hex.** Colour comes from the Tailwind utilities backed by
   `theme.css`: `bg-background`, `bg-surface`, `bg-surface-2`, `border-border`,
   `text-foreground`, `text-muted`, `bg-primary`, `text-success/warning/danger/neutral`.
3. **Dark only.** No light theme, no `dark:` variants. `color-scheme: dark` is global.
4. **Mobile-first, single column.** Page content lives inside `<Container>` (`max-w-2xl`).
5. **Rounded + soft.** Cards are `rounded-2xl`; controls `rounded-xl`.
6. **Font is Manrope** (`--font-manrope`, wired in `app/layout.tsx`).

## Tokens (`theme.css`)
| Token | Utility | Use |
|---|---|---|
| `--background` | `bg-background` | App background (near-black violet) |
| `--surface` | `bg-surface` | Cards |
| `--surface-2` | `bg-surface-2` | Inputs, nested rows |
| `--border` | `border-border` | Hairlines |
| `--foreground` / `--muted` | `text-foreground` / `text-muted` | Primary / secondary text |
| `--primary` | `bg-primary` | Brand violet (primary actions) |
| `--accent` | `bg-accent` | Indigo accent |
| `--success` | `text-success` | **Blackjack** (=21) — emerald |
| `--warning` | `text-warning` | **Short** (<21) — amber |
| `--danger` | `text-danger` | **Bust** (>21) — rose |
| `--neutral` | `text-neutral` | **Invalid** (a player on 0) — zinc |

The signature header gradient uses Tailwind's built-in palette directly:
`from-violet-950 via-indigo-900 to-violet-950`.

## Components (`index.ts`)
- `Header`, `Footer`, `Container` — app shell.
- `Card`, `CardTitle`, `CardSubtitle` — content surfaces.
- `Button` (`primary | secondary | ghost | danger`, `sm | md | lg`).
- `StatePill` — the four lineup states (`invalid | short | blackjack | bust`).
- `ScoreMeter` — the big `total / 21` readout, coloured by state.
- `Badge`, `PositionBadge` (QB/RB/WR/TE), `PlayerRow`, `Input`.

## Lineup-state colour mapping (canonical)
`invalid → neutral`, `short → warning`, `blackjack → success`, `bust → danger`.
Keep this consistent everywhere state is shown.

## See it
Run the app and open **`/design`** for the live component gallery.
