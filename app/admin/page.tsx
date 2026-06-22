import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getAdminStats, listFeedback } from "@/lib/db/queries";
import { isLocked } from "@/lib/lock";
import { Badge, Card, CardTitle, CardSubtitle, Container } from "@/design";
import { RefreshButton } from "./RefreshButton";
import { ResetDataButton } from "./ResetDataButton";
import { FeedbackStatusSelect } from "./FeedbackStatusSelect";

export default async function AdminPage() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");

  const stats = await getAdminStats();
  const locked = isLocked();
  const feedbackRows = await listFeedback();

  return (
    <Container className="space-y-4 py-8">
      <Card>
        <CardTitle>Admin</CardTitle>
        <CardSubtitle>
          {stats.submittedCount} of {stats.entrantCount} profiles have a confirmed lineup.
        </CardSubtitle>
        <div className="mt-3">
          <Badge>{locked ? "Locked" : "Open"}</Badge>
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
        <CardTitle>Danger zone</CardTitle>
        <CardSubtitle>
          Permanently deletes every entrant, profile, and pick — use this to wipe test entries
          before real signups open. Players, stats, and feedback are untouched.
        </CardSubtitle>
        <div className="mt-3">
          <ResetDataButton />
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
