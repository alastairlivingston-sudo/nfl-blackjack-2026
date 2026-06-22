import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card, CardTitle, CardSubtitle, Container, PlayerRow } from "@/design";
import { getEntrantByEmail, getEntrantPickIds, getLineup } from "@/lib/db/queries";
import { isLocked } from "@/lib/lock";
import { ProfileForm } from "./ProfileForm";
import { PlayerPicker } from "./PlayerPicker";
import { SignOutButton } from "./SignOutButton";

export default async function EntryPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");

  const entrant = await getEntrantByEmail(email);
  const locked = isLocked();

  if (locked) {
    if (!entrant) {
      return (
        <Container className="space-y-4 py-8">
          <div className="flex justify-end">
            <SignOutButton />
          </div>
          <Card>
            <CardTitle>Entries are closed</CardTitle>
            <CardSubtitle>Week 1 has kicked off and you didn&apos;t submit a lineup.</CardSubtitle>
          </Card>
        </Container>
      );
    }
    const lineup = await getLineup(entrant.id);
    return (
      <Container className="space-y-4 py-8">
        <div className="flex justify-end">
          <SignOutButton />
        </div>
        <Card>
          <CardTitle>{entrant.displayName}</CardTitle>
          <CardSubtitle>Entries are locked — here&apos;s your final lineup.</CardSubtitle>
        </Card>
        <div className="space-y-2">
          {lineup.map((p) => (
            <PlayerRow key={p.playerId} name={p.fullName} team={p.team ?? "FA"} position={p.position} />
          ))}
        </div>
      </Container>
    );
  }

  const pickIds = entrant ? await getEntrantPickIds(entrant.id) : [];

  return (
    <Container className="space-y-4 py-8">
      <div className="flex justify-end">
        <SignOutButton />
      </div>
      <ProfileForm
        initial={
          entrant
            ? {
                displayName: entrant.displayName,
                socialHandle: entrant.socialHandle,
                tagConsent: entrant.tagConsent,
                donationConfirmed: entrant.donationConfirmed,
              }
            : undefined
        }
        justGivingUrl={process.env.JUSTGIVING_URL}
      />
      {entrant ? <PlayerPicker initialPlayerIds={pickIds} /> : null}
    </Container>
  );
}
