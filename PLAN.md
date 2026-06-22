# NFL Blackjack 2026 — Build Plan

## Context
We're building a season-long fantasy-style charity game from scratch. Players each pick
**5 NFL players** and try to make their combined **non-passing touchdowns (rushing +
receiving)** across the **2026 regular season (weeks 1–18)** land as close to **21** as
possible without going over — blackjack with TDs. The app is the source of truth for
entries, scores itself off live NFL stats, and shows an always-on public scoreboard. The
outcome is a polished, mobile-first web app that comfortably handles ~1,000 users, plus a
fun single-player **"21 Generator"** practice mode using completed 2025 stats.

## Locked decisions
| Area | Decision |
|---|---|
| Entries | In-app; app is source of truth. **One lineup per email.** |
| Auth | **Google OAuth only** (Auth.js / NextAuth v5). Magic-link by email was dropped — no transactional email sender is configured for sign-in. |
| Database | **Vercel Postgres (Neon)** via the serverless HTTP driver. |
| Stats source | **Sleeper API** (free, no key) primary; ESPN fallback. |
| Player picker | **Typeahead from a prebuilt player list — no fuzzy matching.** Picks stored as exact `player_id`. |
| Lock & reveal | **Single deadline at Week 1 kickoff.** Editable until then, frozen + publicly revealed after. |
| Win condition | **Closest to 21 without busting.** >21 busts; highest total ≤21 wins; ties → earliest valid submission. |
| Donations | **Not enforced.** External JustGiving link/CTA only; does not affect validity. |
| Feedback | In-app form → stored + emailed digest + admin aggregation view; fixes shipped in a later Claude session. |
| Design | Built here as a self-contained, extractable layer. Extraction to its own public repo = v2. |

## Scoring engine (precise spec)
- **Unit:** a player's non-passing TDs = `rush_td + rec_td`, summed over weeks 1–18 of the 2026 regular season. (QB rushing TDs count; defensive/special-teams TDs never count.)
- **Lineup:** exactly **5 distinct** players. Same player may appear across *different* entrants (not a draft).
- **Total:** sum of all 5 players' non-passing TDs.
- **Eligibility/validity:** a lineup is **VALID** only if **each of the 5 players scores ≥1 non-passing TD** by end of Week 18; otherwise **INVALID** (cannot win), even if the total is good.
- **States:** `invalid` (any player on 0) → `short` (<21) → `blackjack` (=21) → `bust` (>21).
- **Winner:** among VALID lineups, exclude busts; the **highest total ≤21** wins (21 = blackjack is the ceiling). **Tie → earliest `submitted_at`.**
- **Edge — all valid lineups bust:** fallback to the **lowest total >21** (closest from above), tie → earliest submission.

## Architecture & stack
- **Next.js (App Router) on Vercel.** Server Components for read paths, Route Handlers for mutations.
- **Neon Postgres** via **`@neondatabase/serverless`** (HTTP) so serverless functions never exhaust connections.
- **Resend** for transactional email (magic links + feedback digests).
- **Vercel Cron** for stats refresh + leaderboard precompute. Staying on the **Hobby plan** (free) means cron is limited to **once per day**; Session 4 adds an admin "refresh now" button hitting the same route on demand for same-day freshness during game weeks.
- **Tailwind v4 + design tokens**, Manrope, dark violet theme.

### Scalability for ~1,000 users
- Writes are trivial: 1,000 entrants × 5 picks = 5,000 rows.
- **Reads are the hot path.** The scoreboard is **precomputed** by the cron job into a `leaderboard` table and served **cached** (ISR/edge), so concurrent viewers hit cache, not the DB.
- **Player list** is a prebuilt static JSON (~100KB gzipped) → typeahead filters **client-side**, zero per-keystroke server calls.
- **Rate-limit** magic-link + feedback endpoints (public surface).
- Hobby/low tiers (Vercel, Neon, Resend) cover 1,000 users.

## Data model
- **entrants** — `id`, `email` (unique), `display_name`, `social_handle`, `tag_consent` (bool), `sleeper_handle?`, `submitted_at` (set when 5 picks confirmed), `created_at`. (One row = one account = one lineup.)
- **picks** — `id`, `entrant_id` FK, `player_id`, `slot` (1–5); `unique(entrant_id, player_id)`.
- **players** (reference) — `id` (Sleeper id, PK), `full_name`, `team`, `position`, `active`, `search_name`.
- **player_week_stats** (cache) — `player_id`, `season`, `week`, `rush_td`, `rec_td`, `updated_at`; PK `(player_id, season, week)`.
- **leaderboard** (precomputed) — `entrant_id`, `total_td`, `state`, `valid`, `rank`, `computed_at`.
- **feedback** — `id`, `entrant_id?`, `email?`, `message`, `context` (page/url), `status` (new/triaged/done), `created_at`.
- **Auth tables** — provided by Auth.js Neon adapter.

## Player picker (typeahead, no fuzzy matching)
- Build script pulls Sleeper's player dump → filter to **active QB/RB/WR/TE** → write `players` rows + a static `players.json` (`id`, name, team, position).
- Client component filters that list **by name prefix/substring as you type**; selection stores the exact `player_id`. No matching heuristics anywhere.

## Feedback system
- In-app feedback form → `feedback` table + emailed to the owner.
- **Admin aggregation view** (owner only) lists/filters all feedback with status.
- Loop: owner brings the aggregated list to a Claude session; fixes ship as commits. (Automated triage→PR is v2.)

## 21 Generator (2025) — nice-to-have
- Standalone mode at `/play`, sharing the design system + scoring concept, using **final 2025 non-passing TD totals** (deterministic).
- Flow: generate **5 random teams** → pick **one player per team** → totals **hidden until a final reveal** vs 21.
- Stateless v1 (no accounts); replayable.

## Build sessions (one at a time, check in between)
- **Session 0 — Design system.** ✅ Tokens, Tailwind preset, core components, `DESIGN.md`, `AGENTS.md`. *Accept:* styled gallery at `/design`.
- **Session 1 — Scaffold + data layer.** ✅ Drizzle schema/migrations (`lib/db/`), Sleeper player import → `players.json` + seed SQL. **Live Neon DB connected, migrated, and seeded (948 players confirmed in `players` table).**
- **Session 2 — Stats ingestion + scoring.** ✅ Scoring engine (`lib/scoring/score.ts`, 11 unit tests), Sleeper weekly TD ingestion (`lib/sleeper.ts`), shared job logic (`lib/jobs/refresh.ts`) called by both CLI scripts and the cron route (`app/api/cron/refresh-stats`), `vercel.json` schedule (daily, Hobby-plan compatible).
- **Session 3 — Public scoreboard.** ✅ `/scoreboard` reads the precomputed `leaderboard` table (ISR, `revalidate = 60`); pre-lock it only shows "Entered" status, post-lock (`lib/lock.ts`, `LOCK_AT` env) it reveals totals/state/rank and links to per-entrant lineups (`/entrants/[id]`). Player detail (`/players/[id]`: weekly TD log + season total + "picked by" once locked) and team pages (`/teams`, `/teams/[team]`).
- **Session 4 — Auth + entries + admin.** ✅ Google OAuth login via Auth.js v5 (Google provider, JWT sessions, `@auth/drizzle-adapter`); `/entry` creates/edits the entrant profile (incl. a self-attested donation checkbox) and a 5-player typeahead lineup (no fuzzy matching, client-filtered against `players.json`) until lock, then shows a read-only final lineup; `/admin` (env allowlist via `lib/admin.ts`) shows entrant/submission counts, a "refresh now" button that runs the same ingest+leaderboard job as the cron route on demand, and a danger-zone reset for clearing test entrants/picks before launch.
- **Session 5 — Feedback + polish + deploy.** ✅ `/feedback` form (stored in `feedback` table + emailed digest via Resend if `FEEDBACK_NOTIFY_EMAIL` is set) with a per-browser cooldown via a signed-free timestamp cookie; `/admin` gained a feedback list with inline status updates (new/triaged/done); `/privacy` note; JustGiving CTA moved to `JUSTGIVING_URL` env (footer link, hidden when unset). Deploy to Vercel still pending — needs real `DATABASE_URL`/Resend/Auth secrets in the Vercel project before going live.
- **Session 6 (nice-to-have) — 21 Generator 2025.** ✅ `/play` (always dynamic, replayable, no accounts) rolls 5 random teams server-side, lets you pick one player per team with totals hidden, then a `revealPlayLineup` action scores the pick against **final 2025** non-passing TDs (reuses `scoreLineup`/`playerWeekStats` with a fixed `PLAY_SEASON = 2025`, separate from the live `NFL_SEASON`). Run `npm run stats:ingest -- --season=2025` once to backfill those final totals. Fixed a latent bug while wiring this up: `seasonTotalsByPlayer`/`computeLeaderboard`/`getPlayer` previously summed `playerWeekStats` across **all** seasons — harmless with only one season's data, but would have double-counted 2025+2026 once both lived in the same table. All three now filter by season explicitly.

## Verification
- **Per session:** acceptance criteria above; scoring engine unit-tested against fixtures; typeahead exercised on mobile viewport.
- **End-to-end (after Session 5):** sign in via magic link → submit 5 distinct players via typeahead → confirm lock → cron ingests stats → scoreboard shows correct totals/state/rank → submit feedback → confirm email + admin view. Deploy to Vercel and smoke-test.

## Out of scope / v2
- Extracting the design system to its own public GitHub repo.
- Donation **enforcement** and any in-app payments.
- Automated feedback → draft-PR pipeline.
- Playoffs, push notifications, OG share images, native apps.

## Open assumptions
- Player pool = active **QB/RB/WR/TE**.
- "Each of 5 players ≥1 non-passing TD or invalid" stays a rule.
- All-bust fallback = lowest total >21 wins.
- 21 Generator is stateless + replayable.
- Auth via **Auth.js (NextAuth v5)** + **Google OAuth**.
