import Link from "next/link";
import { Button, Card, CardTitle, CardSubtitle, PlayerRow } from "@/design";
import { auth } from "@/auth";
import { getEntrantByEmail, getEntrantPickIds, getLineup } from "@/lib/db/queries";
import { isLocked } from "@/lib/lock";

/**
 * Marketing hero shown to signed-out visitors (and as the Suspense fallback so
 * the page still paints instantly before the personalized version streams in).
 */
export function SignedOutHero() {
  return (
    <section className="text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-violet-300">2026 Season</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
        Pick 5. Chase <span className="text-violet-300">21</span>. Don&apos;t bust.
      </h1>
      <p className="mx-auto mt-4 max-w-md text-muted">
        Draft five NFL players and add up their non-passing touchdowns across weeks 1&ndash;18. Hit
        exactly 21 for blackjack &mdash; go over and you&apos;re out.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/entry">
          <Button size="lg">Sign up &amp; enter</Button>
        </Link>
        <Link href="/scoreboard">
          <Button size="lg" variant="secondary">
            View scoreboard
          </Button>
        </Link>
      </div>
    </section>
  );
}

/**
 * Per-request hero. Signed-out visitors get the marketing pitch; signed-in
 * users get their own entry (view/edit) plus a nudge to play the 21 Generator,
 * instead of being pointed back at the sign-up flow.
 */
export async function HomeHero() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <SignedOutHero />;

  const entrant = await getEntrantByEmail(email);
  const greeting = entrant?.displayName ?? session.user?.name ?? "you";

  // No entry yet — nudge them to set one up, then play.
  if (!entrant) {
    return (
      <PersonalHero
        title={`Welcome, ${greeting}`}
        subtitle="You're signed in but haven't entered yet. Set up your lineup before Week 1 kicks off."
        primary={{ href: "/entry", label: "Set up your entry" }}
      />
    );
  }

  const locked = isLocked();
  const submitted = Boolean(entrant.submittedAt);
  const pickIds = await getEntrantPickIds(entrant.id);
  const lineup = submitted ? await getLineup(entrant.id) : [];

  const subtitle = submitted
    ? locked
      ? "Entries are locked — here's your final lineup."
      : "Your lineup is in. You can still edit it until Week 1 kicks off."
    : `You've started your entry — ${pickIds.length} of 5 picked. Finish before Week 1 to be in.`;

  return (
    <PersonalHero
      title={`Welcome back, ${entrant.displayName}`}
      subtitle={subtitle}
      primary={
        submitted
          ? { href: "/play", label: "🎲 Play the 21 Generator" }
          : { href: "/entry", label: "Finish your entry" }
      }
      secondary={
        submitted
          ? { href: "/entry", label: locked ? "View entry" : "Edit entry" }
          : { href: "/play", label: "🎲 Play the 21 Generator" }
      }
    >
      {lineup.length > 0 ? (
        <div className="mt-4 space-y-2 text-left">
          {lineup.map((p) => (
            <PlayerRow key={p.playerId} name={p.fullName} team={p.team ?? "FA"} position={p.position} />
          ))}
        </div>
      ) : null}
    </PersonalHero>
  );
}

function PersonalHero({
  title,
  subtitle,
  primary,
  secondary,
  children,
}: {
  title: string;
  subtitle: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <CardSubtitle>{subtitle}</CardSubtitle>
      {children}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={primary.href}>
          <Button size="lg">{primary.label}</Button>
        </Link>
        {secondary ? (
          <Link href={secondary.href}>
            <Button size="lg" variant="secondary">
              {secondary.label}
            </Button>
          </Link>
        ) : null}
        <Link href="/scoreboard">
          <Button size="lg" variant="secondary">
            Scoreboard
          </Button>
        </Link>
      </div>
    </Card>
  );
}
