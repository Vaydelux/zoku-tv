/**
 * Same-origin image optimization is an emergency fallback, not the default
 * delivery path. Only canonical public TMDB artwork may use it.
 */
export function tmdbArtworkFallback(src: string): string | null {
  try {
    const url = new URL(src);
    if (url.origin !== "https://image.tmdb.org" || url.username || url.password || url.search || url.hash) return null;
    const match = /^\/t\/p\/(w[0-9]+|original)\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.exec(url.pathname);
    if (!match) return null;
    const size = match[1];
    const width = size === "original" || size === "w1280" ? 1080 : size === "w780" ? 828 : 384;
    return "/_next/image?url=" + encodeURIComponent(url.href) + "&w=" + width + "&q=75";
  } catch {
    return null;
  }
}
