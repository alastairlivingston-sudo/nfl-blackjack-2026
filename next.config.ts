import type { NextConfig } from "next";

/**
 * Unique per deploy so open tabs can detect a new version has shipped (see
 * app/api/version/route.ts + app/StaleBuildBanner.tsx). Vercel sets the commit
 * SHA on every deploy; fall back to a timestamp so local dev still gets a
 * distinct value across restarts.
 */
const buildId = process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now());

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  outputFileTracingIncludes: { "/api/admin/migrate": ["./drizzle/**"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
