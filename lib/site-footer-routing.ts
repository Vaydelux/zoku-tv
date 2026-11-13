import { isBrandRoute } from "@/lib/auth-routes";

/** Full-screen player routes do not show the application footer.
 * A path-prefix check against "/watch" is incorrect because it also matches
 * "/watchlist", which must keep the footer visible.
 */
export function shouldHideZokuFooter(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/watch" || pathname.startsWith("/watch/") || isBrandRoute(pathname);
}
