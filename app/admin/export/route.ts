import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { exportEntrants } from "@/lib/db/queries";

// Admin-only CSV export of entrants + their lineups. Email is intentionally
// excluded (see the /admin "Export entrants" button).

/** RFC-4180 field escaping: wrap in quotes and double any embedded quotes. */
function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvField).join(",")).join("\r\n");
}

export async function GET() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return new Response("Not authorized", { status: 403 });
  }

  const entrants = await exportEntrants();

  const header = [
    "Display name",
    "Social handle",
    "Tag consent",
    "Donation confirmed",
    "Age confirmed",
    "Submitted at",
    "Created at",
    "Pick 1",
    "Pick 2",
    "Pick 3",
    "Pick 4",
    "Pick 5",
  ];

  const rows = entrants.map((e) => [
    e.displayName,
    e.socialHandle ?? "",
    e.tagConsent ? "yes" : "no",
    e.donationConfirmed ? "yes" : "no",
    e.ageConfirmed ? "yes" : "no",
    e.submittedAt ? e.submittedAt.toISOString() : "",
    e.createdAt.toISOString(),
    ...Array.from({ length: 5 }, (_, i) => e.picks[i] ?? ""),
  ]);

  const csv = toCsv([header, ...rows]);
  const filename = `entrants-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
