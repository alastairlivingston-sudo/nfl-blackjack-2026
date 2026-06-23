# Code Critique — Touchdown Blackjack (production-readiness audit)

You are a senior engineer doing a **release-blocking audit** of this codebase before it goes
live to ~1,000 real users in a season-long charity game. The scoreboard is the **source of
truth** for who wins, so a scoring bug is not cosmetic — it picks the wrong winner. Your job is
to find real bugs and prove the code is production-ready, not to praise it.

## Ground rules (read before you start)

1. **This is a forked Next.js with breaking changes.** Do NOT rely on training-data knowledge of
   Next.js / App Router / Auth.js APIs. Read `node_modules/next/dist/docs/` for any API you touch,
   and heed deprecation notices in the source. Flag any usage that contradicts the installed docs.
2. **Read `PLAN.md` first — it is the build contract.** Every behavior you critique must be judged
   against the locked decisions and the *precise* scoring spec there, not against what you assume a
   blackjack game should do.
3. **Read `AGENTS.md` and `design/DESIGN.md`** for the design-system rules (import from `@/design`,
   tokens not hex, dark-only/mobile-first, canonical state→colour mapping).
4. Prefer evidence over speculation. For every finding give: **file:line**, the concrete failure
   case (inputs → wrong output), severity, and a minimal fix. Distinguish **confirmed bugs** from
   **suspicions to verify**. No vague "consider refactoring."

## Severity scale

- **P0 — wrong winner / data loss / security:** scoring math, validity rules, tie-breaks, auth
  bypass, one-lineup-per-email enforcement, lock-bypass, SQL injection, leaked secrets.
- **P1 — breaks for real users:** crashes, race conditions, cron double-counting, ingestion writing
  bad stats, rate-limit gaps on public endpoints, ISR serving stale/contradictory data.
- **P2 — correctness edge cases & resilience:** timezone/DST on the lock deadline, empty/null
  stats, API failure handling, pagination/perf at 1,000 entrants.
- **P3 — quality:** design-system violations, dead code, types, a11y, naming.

## Where the bugs most likely live — hunt these explicitly

### 1. Scoring engine (`lib/scoring/score.ts`, `score.test.ts`) — the heart
Verify against the PLAN spec line by line:
- Unit = `rush_td + rec_td` only. Confirm **passing TDs never count** and **defensive/special-teams
  TDs never count**, even if such columns exist or get ingested.
- Lineup must be **exactly 5 distinct** players. What happens with 4, 6, or duplicate `player_id`s?
- **Validity:** a lineup is INVALID if *any* of the 5 players has 0 non-passing TDs by Week 18.
  Confirm an invalid lineup can never win even with a perfect total of 21.
- **State ordering** `invalid → short(<21) → blackjack(=21) → bust(>21)`: check boundaries at
  exactly 20, 21, 22, and the case where total=21 but one player is on 0 (must be `invalid`, not
  `blackjack`).
- **Winner selection:** highest total ≤21 among valid non-busts; **tie → earliest `submitted_at`**.
  Verify the tie-break actually reads `submitted_at` and is deterministic (stable sort, no `Date`
  parsing ambiguity).
- **All-bust fallback:** lowest total >21 wins, tie → earliest submission. Is this branch tested?
- Check the existing 11 unit tests for **coverage gaps**: do they assert the tie-break, the
  all-bust fallback, the 21-but-invalid case, and the exact-boundary states? Add the missing cases.

### 2. Season filtering (regression-prone — already bit once)
PLAN.md Session 6 notes a fixed bug where totals summed across **all seasons**. Re-audit every
place that aggregates `player_week_stats`: `seasonTotalsByPlayer`, `computeLeaderboard`, `getPlayer`,
the `/players/[id]` weekly log, and the 21-Generator path. Confirm **every** query filters by the
intended season (`NFL_SEASON` live vs `PLAY_SEASON = 2025`) and that the two never bleed together.
Grep for raw sums over the stats table without a season predicate.

### 3. Lock / reveal timing (`lib/lock.ts`, `LOCK_AT`)
- Pre-lock the scoreboard shows only "Entered"; post-lock it reveals totals/state/rank. Find any
  read path that leaks lineups, totals, or "picked by" **before** lock.
- Confirm entries are editable until lock and **frozen after** — including via the API route, not
  just the UI (can a crafted POST edit a lineup after lock?).
- `LOCK_AT` timezone/DST: is it parsed as UTC or local? What happens if the env var is unset or
  malformed — does it fail open (everything editable forever) or closed?

### 4. Cron + ingestion idempotency (`lib/jobs/refresh.ts`, `app/api/cron/refresh-stats`, `lib/sleeper.ts`)
- The job runs daily AND from the admin "refresh now" button. Running it **twice** must be safe —
  confirm weekly stats UPSERT on PK `(player_id, season, week)` and never **add** to existing TD
  counts (double-count risk).
- Is the cron route **authenticated** (Vercel cron secret / header check)? An open refresh endpoint
  is a P1 abuse/DoS vector.
- Sleeper API failure handling: partial response, network error, schema drift, a player missing —
  does the job abort cleanly without writing garbage or a half-updated leaderboard? Is there a
  transaction around the leaderboard recompute so the scoreboard never shows a half-written state?
- ESPN fallback (mentioned in PLAN): is it actually wired, and does it map to the same unit?

### 5. Auth & one-lineup-per-email (`auth.ts`, `app/api/auth/*`, `/entry`, `lib/admin.ts`)
- Magic-link (Auth.js v5 + Resend, JWT sessions): verify session checks on **every** mutation route,
  not just page render. Can an unauthenticated or other-user request create/edit someone's lineup?
- **One lineup per email** is a locked rule — enforced by a DB unique constraint, not just app logic?
  Check the race: two concurrent submits for the same new email.
- Admin allowlist (`lib/admin.ts`): env-based — confirm it's checked server-side on the admin data
  and the refresh button, and can't be spoofed via header/cookie.
- Rate-limiting on magic-link and feedback endpoints (PLAN calls for it). Is it real and per-IP/email,
  or missing? Public unauthenticated email-send is a spam/cost vector.

### 6. Data integrity (`lib/db/schema.ts`, `drizzle/*.sql`, `queries.ts`)
- Do the migrations match the schema and the PLAN data model? Check FKs, `unique(entrant_id,
  player_id)`, `unique(email)`, cascade behavior on entrant delete.
- Any raw SQL string interpolation (injection)? Confirm parameterized queries throughout.
- `picks.slot` 1–5 — enforced? Can a lineup have two picks in the same slot or 6 picks?

### 7. Scale & caching (PLAN: ~1,000 users, reads are the hot path)
- Scoreboard ISR (`revalidate = 60`) reads precomputed `leaderboard`. Confirm read paths never hit
  the DB per-viewer in a way that melts under concurrent load.
- `players.json` typeahead is client-filtered (no per-keystroke server calls) — confirm. Check the
  bundle/payload size and that there's no accidental server round-trip.

## Required commands — run them, paste real output, don't assume

```
npm run lint
npx tsc --noEmit        # typecheck — must be clean
npm test                # the scoring unit tests (tsx --test lib/**/*.test.ts)
npm run build           # production build must succeed
```

Report exact pass/fail with output. If a command fails, that's a finding. If `tsc`/lint isn't part
of CI, note that as a gap.

## New tests to add (don't just read — prove it)
For each scoring rule above with no test, **write a failing-then-passing unit test** in
`score.test.ts`: tie-break by `submitted_at`, all-bust fallback, 21-but-one-player-on-0 = invalid,
boundary states at 20/21/22, duplicate/short/oversized lineups. Add a season-isolation test that
seeds 2025 and 2026 stats for the same player and asserts each season totals independently. Propose
(or stub) an end-to-end smoke test mirroring PLAN's E2E flow: magic-link → submit 5 distinct picks →
lock → ingest → scoreboard totals/state/rank → feedback → admin view.

## Output format
1. **Verdict:** ship / don't ship, one paragraph.
2. **Findings table:** ID | severity | file:line | failure case | fix.
3. **Command results:** lint / tsc / test / build, with output.
4. **Tests added or proposed**, with the diff.
5. **Open questions / can't-verify-without-runtime** items, explicitly listed.

Fix P0/P1 issues you're confident about directly (with tests proving the fix); leave anything
ambiguous or architecturally significant as a documented finding for me to decide. Do not push or
open a PR unless I ask.
