"use client";

import { useEffect } from "react";
import { Card, CardTitle, CardSubtitle, Container, Button } from "@/design";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-8">
      <Card className="max-w-sm text-center">
        <CardTitle>Something went wrong.</CardTitle>
        <CardSubtitle>
          Our side, not yours. Try again — if it keeps happening, send us feedback from the home page.
        </CardSubtitle>
        <Button className="mt-4 w-full" onClick={reset}>
          Try again
        </Button>
      </Card>
    </Container>
  );
}
