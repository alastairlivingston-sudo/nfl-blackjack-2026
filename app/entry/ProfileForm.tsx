"use client";

import { useActionState } from "react";
import { Button, Card, CardTitle, CardSubtitle, Input } from "@/design";
import { saveProfile, type ActionState } from "./actions";

const DEFAULT_JUSTGIVING_URL = "https://www.justgiving.com/page/touchdownblackjack26";

/** Generic heart icon (not JustGiving's official logo) for the donate CTA. */
function DonateHeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 fill-white">
      <path d="M12 21s-7.5-4.9-10-9.4C.5 8.7 1.8 5 5.2 5c2 0 3.3 1.1 4.1 2.3.7 1 .7 1 .7 1s0 0 .7-1C11.5 6.1 12.8 5 14.8 5c3.4 0 4.7 3.7 3.2 6.6C19.5 16.1 12 21 12 21z" />
    </svg>
  );
}

export function ProfileForm({
  initial,
  justGivingUrl,
}: {
  initial?: {
    displayName: string;
    socialHandle: string | null;
    tagConsent: boolean;
    donationConfirmed: boolean;
    ageConfirmed: boolean;
  };
  justGivingUrl?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProfile, {});
  const donateUrl = justGivingUrl ?? DEFAULT_JUSTGIVING_URL;

  return (
    <Card>
      <CardTitle>{initial ? "Edit your details" : "Set up your entry"}</CardTitle>
      <CardSubtitle>This is the name that shows on the public scoreboard.</CardSubtitle>

      <form action={action} className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-muted">
          Display name
          <Input
            name="displayName"
            defaultValue={initial?.displayName}
            placeholder="e.g. Al's Picks"
            required
            maxLength={60}
            className="mt-1"
          />
        </label>

        <label className="block text-sm font-medium text-muted">
          Social handle (optional)
          <Input
            name="socialHandle"
            defaultValue={initial?.socialHandle ?? ""}
            placeholder="@handle"
            className="mt-1"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            name="tagConsent"
            defaultChecked={initial?.tagConsent}
            className="h-4 w-4 rounded border-border bg-surface-2"
          />
          Happy to be tagged in updates
        </label>

        <p className="text-sm text-muted">
          Follow{" "}
          <a
            href="https://x.com/TD_Blackjack"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-violet-300 hover:text-white"
          >
            @TD_Blackjack
          </a>{" "}
          on X for updates and prize giveaways.
        </p>

        <div className="rounded-xl border border-border bg-surface-2 p-3">
          <p className="text-sm text-muted">
            We&apos;re raising money for Petals — please chip in via JustGiving if you can.
            There&apos;s no set amount, so pay what you can; we suggest £10.
          </p>
          <a
            href={donateUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pink-500"
          >
            <DonateHeartIcon />
            Donate on JustGiving
          </a>
          <label className="mt-3 flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="donationConfirmed"
              defaultChecked={initial?.donationConfirmed}
              className="h-4 w-4 rounded border-border bg-surface-2"
            />
            I&apos;ve donated — optional, just so we can say thanks!
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            name="ageConfirmed"
            defaultChecked={initial?.ageConfirmed}
            required
            className="h-4 w-4 rounded border-border bg-surface-2"
          />
          I confirm I&apos;m 18 or over
        </label>

        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save changes" : "Continue"}
        </Button>
      </form>
    </Card>
  );
}
