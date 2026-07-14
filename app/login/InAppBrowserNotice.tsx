"use client";

import { useState } from "react";
import { Button } from "@/design";
import type { MobilePlatform } from "@/lib/in-app-browser";

function openInstruction(platform: MobilePlatform): string {
  switch (platform) {
    case "ios":
      return "Tap the ••• (or share) icon at the corner of the screen, then choose “Open in Safari”.";
    case "android":
      return "Tap the ⋮ menu at the corner of the screen, then choose “Open in Chrome” (or “Open in browser”).";
    default:
      return "Open this page in your phone’s main browser (Safari or Chrome) using the app’s menu.";
  }
}

function buildAndroidIntentUrl(platform: MobilePlatform, url: string): string | null {
  if (platform !== "android") return null;
  try {
    const parsed = new URL(url);
    return `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=https;package=com.android.chrome;end`;
  } catch {
    return null;
  }
}

/**
 * Shown when the user arrives inside an embedded webview (Twitter/X, Facebook,
 * etc.) where Google sign-in can't complete. We can't OAuth here, so we help
 * them get to their real browser: platform-specific instructions, a copy-link
 * button, and — on Android only — a direct Chrome break-out link that actually
 * works. iOS webviews have no reliable programmatic escape, hence instructions.
 */
export function InAppBrowserNotice({
  url,
  platform,
}: {
  url: string;
  platform: MobilePlatform;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked in this webview — the manual instructions still apply.
      setCopied(false);
    }
  }

  // Android can force-open Chrome via an intent URL; iOS has no equivalent.
  const androidIntentUrl = buildAndroidIntentUrl(platform, url);

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
        <p className="font-semibold text-warning">Open in your browser to sign in</p>
        <p className="mt-1 text-muted">
          Google sign-in doesn’t work inside the {`in-app`} browser you’re using. {openInstruction(platform)}
        </p>
      </div>

      {androidIntentUrl && (
        <Button
          type="button"
          variant="primary"
          className="w-full"
          onClick={() => {
            window.location.href = androidIntentUrl;
          }}
        >
          Open in Chrome
        </Button>
      )}

      <Button type="button" variant="secondary" className="w-full" onClick={copyLink}>
        {copied ? "Link copied — paste it in your browser" : "Copy link"}
      </Button>
    </div>
  );
}
