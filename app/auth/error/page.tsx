import { headers } from "next/headers";
import { Button, Card, CardTitle, CardSubtitle, Container } from "@/design";
import { getMobilePlatform, isInAppBrowser } from "@/lib/in-app-browser";
import { InAppBrowserNotice } from "@/app/login/InAppBrowserNotice";

/**
 * Custom Auth.js error page (wired via `pages.error` in auth.ts).
 *
 * Auth.js redirects here with `?error=<code>` when sign-in fails. The default
 * page just says "There is a problem with the server configuration", which is
 * baffling for the common case: the user is inside an embedded webview
 * (Twitter/X, Facebook, …) where Google OAuth can't complete. Detect that and
 * give them the "open in your browser" path; fall back to a plain retry link.
 */
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const hdrs = await headers();
  const ua = hdrs.get("user-agent");
  const inAppBrowser = isInAppBrowser(ua);
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("host") ?? "";
  const loginUrl = host ? `${proto}://${host}/login` : "/login";

  return (
    <Container className="py-8">
      <Card>
        <CardTitle>Couldn’t sign you in</CardTitle>
        <CardSubtitle>
          {inAppBrowser
            ? "Sign-in doesn’t work inside this app’s built-in browser."
            : "Something went wrong finishing sign-in. Please try again."}
        </CardSubtitle>

        {inAppBrowser ? (
          <InAppBrowserNotice url={loginUrl} platform={getMobilePlatform(ua)} />
        ) : (
          <form action="/login" className="mt-4">
            <Button type="submit" variant="secondary" className="w-full">
              Back to sign in
            </Button>
          </form>
        )}

        {error ? (
          <p className="mt-3 text-xs text-muted">Error code: {error}</p>
        ) : null}
      </Card>
    </Container>
  );
}
