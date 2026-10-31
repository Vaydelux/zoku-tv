"use client";

import { usePathname } from "next/navigation";
import { AmbientBackground } from "@/components/AmbientBackground";
import { SiteFooter } from "@/components/SiteFooter";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative z-[1] flex min-h-full flex-col">
      <AmbientBackground />
      <div
        key={pathname}
        className="page-route-transition relative z-[1] flex min-h-full flex-1 flex-col"
      >
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
