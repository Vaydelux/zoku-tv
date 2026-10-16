"use client";

import { Suspense, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tv } from "lucide-react";
import { useSessionStore } from "@/stores";
import { getAuthRedirectTarget } from "@/lib/auth-routes";

function SplashAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="ambient-orb ambient-orb--a" />
      <div className="ambient-orb ambient-orb--b" />
      <div className="ambient-orb ambient-orb--c" />
    </div>
  );
}

function AuthGateContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, currentProfile, initializing } = useSessionStore();

  const search = searchParams.toString();
  const nextParam = searchParams.get("next");

  const redirectTarget = useMemo(
    () =>
      getAuthRedirectTarget({
        pathname,
        search: search ? `?${search}` : "",
        user,
        currentProfile,
        initializing,
        nextParam,
      }),
    [pathname, search, user, currentProfile, initializing, nextParam]
  );

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [redirectTarget, router]);

  if (initializing || redirectTarget) {
    return (
      <div className="splash-shell">
        <SplashAtmosphere />
        <div className="relative z-[1] flex flex-col items-center gap-4 animate-pulse">
          <Tv className="h-10 w-10 text-primary" />
          <span className="font-display text-sm font-bold tracking-wider text-on-surface">
            ZOKU<span className="text-primary font-mono text-xs ml-0.5">TV</span>
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="splash-shell">
          <SplashAtmosphere />
          <div className="relative z-[1] h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <AuthGateContent>{children}</AuthGateContent>
    </Suspense>
  );
}
