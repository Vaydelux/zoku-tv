"use client";

import { Suspense, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tv } from "lucide-react";
import { useSessionStore } from "@/stores";
import { getAuthRedirectTarget } from "@/lib/auth-routes";

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
      <div className="flex h-screen w-screen items-center justify-center bg-background text-on-surface">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Tv className="h-10 w-10 text-primary" />
          <span className="font-display text-sm font-bold tracking-wider text-on-surface-variant">
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
        <div className="flex h-screen w-screen items-center justify-center bg-background text-on-surface">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <AuthGateContent>{children}</AuthGateContent>
    </Suspense>
  );
}
