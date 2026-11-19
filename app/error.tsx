"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw, Server } from "lucide-react";

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
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-border-custom bg-surface p-6 sm:p-8 text-center space-y-5 shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
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
