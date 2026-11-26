/**
 * Centralized enterprise HTTP security headers for Next.js responses.
 * Permits TMDB / AniList / Kitsu image CDNs, Google Fonts, Firebase Auth/Firestore,
 * YouTube trailers, and external HTTPS playback provider iframes while locking down
 * framing ancestors, plugins, base URI hijacking, and MIME sniffing.
 */

export interface SecurityHeaderEntry {
  key: string;
  value: string;
}

export function buildContentSecurityPolicy(isProd = process.env.NODE_ENV === "production"): string {
  const directives: string[] = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    // Next.js App Router hydration & inline fetch guard require 'unsafe-inline'; dev adds 'unsafe-eval' for HMR.
    isProd
      ? "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://image.tmdb.org https://s4.anilist.co https://media.kitsu.io https://lh3.googleusercontent.com https://images.unsplash.com https:",
    "media-src 'self' blob: https:",
    // Firebase Auth/Firestore + local first-party APIs + YouTube / external streams
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com",
    // External embed providers & YouTube trailers run inside explicit sandboxed/controlled iframes
    "frame-src 'self' https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (isProd) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function buildSecurityHeaders(
  isProd = process.env.NODE_ENV === "production"
): SecurityHeaderEntry[] {
  const headers: SecurityHeaderEntry[] = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(isProd),
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "SAMEORIGIN",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)",
    },
    {
      key: "X-DNS-Prefetch-Control",
      value: "on",
    },
  ];

  if (isProd) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  return headers;
}
