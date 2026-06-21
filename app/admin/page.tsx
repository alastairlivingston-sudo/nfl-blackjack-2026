import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getAdminStats } from "@/lib/db/queries";
import { isLocked } from "@/lib/lock";
import { Badge, Card, CardTitle, CardSubtitle, Container } from "@/design";
import { RefreshButton } from "./RefreshButton";

export default async function AdminPage() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");

  const stats = await getAdminStats();
  const locked = isLocked();

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
    </Container>
  );
}
