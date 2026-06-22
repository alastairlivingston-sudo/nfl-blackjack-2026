import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getAdminStats, listFeedback } from "@/lib/db/queries";
import { isLocked, lockAt } from "@/lib/lock";
import { Badge, Card, CardTitle, CardSubtitle, Container } from "@/design";
import { RefreshButton } from "./RefreshButton";
import { FeedbackStatusSelect } from "./FeedbackStatusSelect";

export default async function AdminPage() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");

  const stats = await getAdminStats();
  const locked = isLocked();
  const lockTime = lockAt();
  const feedbackRows = await listFeedback();

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
