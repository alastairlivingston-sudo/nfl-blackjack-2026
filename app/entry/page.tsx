import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card, CardTitle, CardSubtitle, Container, PlayerRow } from "@/design";
import { getEntrantByEmail, getEntrantPickIds, getLineup, getPlayersByIds } from "@/lib/db/queries";
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

  // Resolve the saved lineup server-side rather than letting the picker look it
  // up in the pool it fetches: a player who's since been cut is no longer in
  // that pool, and looking him up there would silently drop him from the
  // entrant's lineup (they'd see 4 of 5 picks, with no idea why).
  const pickIds = entrant ? await getEntrantPickIds(entrant.id) : [];
  const picked = await getPlayersByIds(pickIds);
  const pickedById = new Map(picked.map((p) => [p.id, p]));
  const initialPlayers = pickIds
    .map((id) => pickedById.get(id))
    .filter((p) => p !== undefined)
    .map((p) => ({ id: p.id, fullName: p.fullName, team: p.team, position: p.position }));

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
                ageConfirmed: entrant.ageConfirmed,
              }
            : undefined
        }
        justGivingUrl={process.env.JUSTGIVING_URL}
      />
      {entrant ? <PlayerPicker initialPlayers={initialPlayers} /> : null}
    </Container>
  );
}
