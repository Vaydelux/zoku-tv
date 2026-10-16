"use client";

import { AmbientBackground } from "@/components/AmbientBackground";
import { SiteFooter } from "@/components/SiteFooter";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-[1] flex min-h-full flex-col">
      <AmbientBackground />
      <div className="relative z-[1] flex min-h-full flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
