"use client";

import { Tv } from "lucide-react";

/** Root route — AuthGate handles redirect to /login, /profiles, or /home. */
export default function RootPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-on-surface">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <Tv className="h-12 w-12 text-primary" />
        <span className="font-display text-xl font-bold tracking-wider">
          ZOKU<span className="text-primary font-mono text-sm ml-0.5">TV</span>
        </span>
      </div>
    </div>
  );
}
