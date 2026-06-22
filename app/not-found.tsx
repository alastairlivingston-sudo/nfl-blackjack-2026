import Link from "next/link";
import { Card, CardTitle, CardSubtitle, Container, Button } from "@/design";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-8">
      <Card className="max-w-sm text-center">
        <CardTitle>Bust.</CardTitle>
        <CardSubtitle>That page doesn&apos;t exist — went over, just like a bad lineup.</CardSubtitle>
        <Link href="/" className="mt-4 block">
          <Button className="w-full">Back to safety</Button>
        </Link>
      </Card>
    </Container>
  );
}
