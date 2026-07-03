import { Suspense } from "react";
import { Container } from "@/design";
import { HomeHero, SignedOutHero } from "./HomeHero";

export default function Home() {
  return (
    <Container className="py-8">
      {/* Personalized for signed-in users (their entry + a nudge to play), streamed
          over the static marketing fallback. Signed-out visitors get the full
          marketing page (hero + example lineup + how-it-works). */}
      <Suspense fallback={<SignedOutHero />}>
        <HomeHero />
      </Suspense>
    </Container>
  );
}
