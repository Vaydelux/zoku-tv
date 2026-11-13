/** One canonical navigation manifest for the fluent cinematic Zoku shell.
 * Uses real Next.js routes rather than the reference prototype's hash router.
 */
export const ZOKU_NAV_ITEMS = [
  { label: "Home", href: "/home" },
  { label: "Search", href: "/search" },
  { label: "Discover", href: "/discover" },
  { label: "Watchlist", href: "/watchlist" },
  { label: "Settings", href: "/settings" },
] as const;

export type ZokuNavHref = (typeof ZOKU_NAV_ITEMS)[number]["href"];

export function activeZokuNavHref(pathname: string | null): ZokuNavHref | null {
  if (!pathname) return null;
  const match = ZOKU_NAV_ITEMS.find((entry) =>
    pathname === entry.href || pathname.startsWith(`${entry.href}/`)
  );
  if (match) return match.href;
  // Existing explicit genre routes belong to Discover; title/player routes do not
  // pretend to be one of the five primary destinations.
  if (pathname === "/genres" || pathname.startsWith("/genre/")) return "/discover";
  return null;
}

export function showZokuMobileNav(pathname: string | null): boolean {
  if (!pathname) return false;
  return !["/", "/login", "/signup", "/profiles"].includes(pathname) &&
    !pathname.startsWith("/watch/");
}
