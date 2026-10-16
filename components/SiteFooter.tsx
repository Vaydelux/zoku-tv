"use client";

import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  const isPlayer = pathname?.startsWith("/watch");

  if (isPlayer) return null;

  return (
    <footer className="relative z-10 mt-auto border-t border-border-custom/60 px-4 py-8 text-center">
      <p className="text-xs text-on-surface-variant">
        All rights reserved 2026
      </p>
    </footer>
  );
}
