"use client";

import { BrandMark } from "@/components/BrandMark";
import { BrandShell } from "@/components/BrandShell";

/** Root route — AuthGate handles redirect to /login, /profiles, or /home. */
export default function RootPage() {
  return (
    <BrandShell>
      <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-4 px-4">
        <BrandMark size="lg" pulse />
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
          aria-hidden="true"
        />
      </div>
    </BrandShell>
  );
}
