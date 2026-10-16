"use client";

import { Suspense, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSessionStore } from "@/stores";
import { getAuthRedirectTarget } from "@/lib/auth-routes";
import { BrandMark } from "@/components/BrandMark";
import { BrandShell } from "@/components/BrandShell";

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
      <BrandShell>
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 animate-pulse px-4">
          <BrandMark size="lg" pulse />
          <span className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
            {user ? "Loading profiles…" : "Starting…"}
          </span>
        </div>
      </BrandShell>
    );
  }

  return <>{children}</>;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <BrandShell>
          <div className="flex min-h-[100dvh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </BrandShell>
      }
    >
      <AuthGateContent>{children}</AuthGateContent>
    </Suspense>
  );
}
