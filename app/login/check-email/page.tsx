import { Card, CardTitle, CardSubtitle, Container } from "@/design";

export default function CheckEmailPage() {
  return (
    <Container className="py-8">
      <Card>
        <CardTitle>Check your email</CardTitle>
        <CardSubtitle>We sent you a sign-in link. It expires shortly, so use it soon.</CardSubtitle>
      </Card>
    </Container>
  );
}
