"use client";

import { useTransition } from "react";
import { Button } from "@/design";
import { signOutAction } from "./actions";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => startTransition(signOutAction)}>
      Sign out
    </Button>
  );
}
