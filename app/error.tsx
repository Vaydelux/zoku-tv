"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw, Server } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Zoku TV route boundary caught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-transparent text-on-surface flex items-center justify-center px-4 py-16">
      <div className="liquid-glass-elevated w-full max-w-lg rounded-[30px] p-6 sm:p-8 text-center space-y-5">
        <div className="flex flex-col items-center gap-3">
          <Link href="/home" aria-label="Zoku TV Home">
            <BrandMark size="sm" />
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/25">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface text-balance">
            Something went wrong loading this view
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Your library and settings are safe. You can retry this screen or jump back to your home feed.
          </p>
          {error?.message && (
            <p className="font-mono text-xs text-on-surface-variant/80 truncate pt-1">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            data-tv-focusable="true"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-contrast hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Try Again
          </button>
          <Link
            href="/home"
            data-tv-focusable="true"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border-custom bg-background px-4 py-2.5 text-sm font-semibold text-on-surface hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Return Home
          </Link>
          <Link
            href="/settings?section=servers"
            data-tv-focusable="true"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border-custom bg-background px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:border-primary/50 hover:text-on-surface transition-colors"
          >
            <Server className="h-4 w-4" aria-hidden="true" />
            Playback Servers
          </Link>
        </div>
      </div>
    </div>
  );
}
