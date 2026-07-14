/**
 * In-app browser detection.
 *
 * Google OAuth cannot be completed inside embedded webviews (Twitter/X,
 * Facebook, Instagram, etc.): Google refuses them with `disallowed_useragent`,
 * and these webviews also tend to drop the Auth.js state/PKCE/nonce cookies
 * between the outbound redirect and the callback. Either way the sign-in dies
 * at the callback and Auth.js shows its generic "Configuration" server error.
 *
 * We can't fix the webview, so we detect it from the User-Agent and steer the
 * user to their real system browser instead. Signatures are deliberately broad
 * — the same bug hits every embedded webview, not just Twitter's.
 */

// Substrings that appear in the UA of the common in-app browsers. Matched
// case-insensitively. Keep this list conservative: false positives push real
// browsers onto the "open elsewhere" path, which is annoying but not broken.
const IN_APP_SIGNATURES = [
  "Twitter", // Twitter / X in-app browser
  "FBAN", // Facebook app (iOS)
  "FBAV", // Facebook app (generic)
  "FB_IAB", // Facebook in-app browser (Android)
  "Instagram",
  "Line/",
  "Snapchat",
  "Pinterest",
  "LinkedInApp",
  "MicroMessenger", // WeChat
  "TikTok",
  "musical_ly", // older TikTok
] as const;

export type MobilePlatform = "ios" | "android" | "other";

export function isInAppBrowser(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return IN_APP_SIGNATURES.some((sig) => ua.includes(sig.toLowerCase()));
}

export function getMobilePlatform(userAgent: string | null | undefined): MobilePlatform {
  if (!userAgent) return "other";
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}
