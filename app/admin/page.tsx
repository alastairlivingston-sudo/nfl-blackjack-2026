import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getAdminStats, listFeedback, listPlaySeasons } from "@/lib/db/queries";
import { isLocked, lockAt } from "@/lib/lock";
import { PLAY_SEASON, PLAY_SEASON_MIN } from "@/lib/season";
import { Badge, Card, CardTitle, CardSubtitle, Container } from "@/design";
import { RefreshButton } from "./RefreshButton";
import { HistoryBackfill } from "./HistoryBackfill";
import { FeedbackStatusSelect } from "./FeedbackStatusSelect";

// Matches the cron route's budget — the manual "refresh now" button calls the
// same ingestSeason job, which without this falls back to Vercel's default
// (much shorter) function timeout and can get killed mid-ingest with no alert.
export const maxDuration = 60;

export default async function AdminPage() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");

  const stats = await getAdminStats();
  const locked = isLocked();
  const lockTime = lockAt();
  const feedbackRows = await listFeedback();

  // Past seasons the 21 Generator can offer, and which are already loaded.
  const pastSeasons = Array.from(
    { length: PLAY_SEASON - PLAY_SEASON_MIN },
    (_, i) => PLAY_SEASON_MIN + i,
  );
  const loadedSeasons = (await listPlaySeasons()).filter((s) => s < PLAY_SEASON);

  return (
    <Container className="space-y-4 py-8">
      <Card>
        <CardTitle>Admin</CardTitle>
        <CardSubtitle>
          {stats.submittedCount} of {stats.entrantCount} profiles have a confirmed lineup.
        </CardSubtitle>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge>{locked ? "Locked" : "Open"}</Badge>
          {lockTime ? (
            <span className="text-xs text-muted">
              {locked ? "Locked at" : "Locks at"} {lockTime.toISOString()}
            </span>
          ) : (
            <span className="text-xs font-semibold text-warning">
              ⚠ LOCK_AT is not set — entries will never lock and the scoreboard will never reveal.
            </span>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Stats refresh</CardTitle>
        <CardSubtitle>Pulls the latest Sleeper stats and recomputes the leaderboard now.</CardSubtitle>
        <div className="mt-3">
          <RefreshButton />
        </div>
      </Card>

      <Card>
        <CardTitle>21 Generator — past seasons</CardTitle>
        <CardSubtitle>
          Load a completed season so the 21 Generator can offer it (imports that year&apos;s scorers,
          non-passing TDs and per-season teams from Sleeper). One season per click; already-loaded
          seasons show a ✓. Safe to re-run.
        </CardSubtitle>
        <div className="mt-3">
          <HistoryBackfill seasons={pastSeasons} loadedInitial={loadedSeasons} />
        </div>
      </Card>

      <Card>
        <CardTitle>Export entrants</CardTitle>
        <CardSubtitle>
          Downloads a CSV of every entrant with a confirmed lineup — display name, social handle,
          consent, donation and age flags, and their 5 picks. Email is not included.
        </CardSubtitle>
        <div className="mt-3">
          <a
            href="/admin/export"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 text-sm font-semibold text-foreground transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Download CSV
          </a>
        </div>
      </Card>

      <Card>
        <CardTitle>Feedback</CardTitle>
        <CardSubtitle>{feedbackRows.length} submissions, newest first.</CardSubtitle>
        <div className="mt-3 space-y-2">
          {feedbackRows.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet.</p>
          ) : (
            feedbackRows.map((f) => (
              <div key={f.id} className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-muted">
                    {f.email ?? "anonymous"}
                    {f.context ? ` · ${f.context}` : ""}
                  </div>
                  <FeedbackStatusSelect id={f.id} status={f.status} />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{f.message}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </Container>
  );
}
