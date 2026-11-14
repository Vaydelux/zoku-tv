export const PUBLIC_ROUTES = ["/login", "/signup"] as const;

export const AUTH_ONLY_ROUTES = ["/profiles"] as const;

/** Pre-app surfaces that always use product brand chrome (not profile themes) */
export function isBrandRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  if (pathname === "/") return true;
  return isPublicRoute(pathname) || isAuthOnlyRoute(pathname);
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isAuthOnlyRoute(pathname: string): boolean {
  return AUTH_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function requiresProfile(pathname: string): boolean {
  if (pathname === "/") return false;
  if (isPublicRoute(pathname)) return false;
  if (isAuthOnlyRoute(pathname)) return false;
  return true;
}

export function sanitizeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  // Browsers normalize backslashes as slashes in special-scheme URLs; a
  // relative path starting "/\\evil.example" can become an external origin.
  // Refuse encoded or literal backslashes, controls and encoded initial slashes
  // before passing next to the Next.js client router.
  if (/[\\\\\u0000-\u001F\u007F]/.test(next) || /%5c/i.test(next) ||
      /^\/(?:%2f|%5c)/i.test(next)) return null;
  try {
    const base = "https://zoku.internal.invalid";
    const target = new URL(next, base);
    if (target.origin !== base || target.username || target.password) return null;
    if (isPublicRoute(target.pathname)) return null;
    return next;
  } catch {
    return null;
  }
}

export function resolvePostLoginPath(
  hasProfile: boolean,
  next: string | null | undefined
): string {
  const safeNext = sanitizeNextPath(next);

  if (!hasProfile) {
    return safeNext
      ? `/profiles?next=${encodeURIComponent(safeNext)}`
      : "/profiles";
  }

  return safeNext ?? "/home";
}

export function buildLoginRedirect(pathname: string, search: string): string {
  const next = `${pathname}${search}`;
  return `/login?next=${encodeURIComponent(next)}`;
}

export function buildProfilesRedirect(pathname: string): string {
  return `/profiles?next=${encodeURIComponent(pathname)}`;
}

/**
 * Returns a redirect target when the current route is not allowed, or null when access is OK.
 */
export function getAuthRedirectTarget(options: {
  pathname: string;
  search: string;
  user: unknown;
  currentProfile: unknown;
  initializing: boolean;
  nextParam: string | null;
}): string | null {
  const { pathname, search, user, currentProfile, initializing, nextParam } = options;

  if (initializing) return null;

  if (pathname === "/") {
    if (!user) return "/login";
    if (!currentProfile) return "/profiles";
    return "/home";
  }

  if (isPublicRoute(pathname)) {
    if (user) {
      return resolvePostLoginPath(!!currentProfile, nextParam);
    }
    return null;
  }

  if (isAuthOnlyRoute(pathname)) {
    if (!user) return buildLoginRedirect(pathname, search);
    return null;
  }

  if (!user) {
    return buildLoginRedirect(pathname, search);
  }

  if (!currentProfile) {
    return buildProfilesRedirect(pathname);
  }

  return null;
}
