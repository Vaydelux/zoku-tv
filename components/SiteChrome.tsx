"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AmbientBackground } from "@/components/AmbientBackground";
import { showZokuMobileNav } from "@/lib/design-navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { QuickTrailerHost } from "@/components/QuickTrailerHost";
import { useCommandPaletteStore } from "@/stores";
import { shouldIgnoreShortcutTarget } from "@/lib/watch-shortcuts";
import { isBrandRoute } from "@/lib/auth-routes";

const CommandPalette = dynamic(
  () => import("@/components/CommandPalette").then((mod) => mod.CommandPalette),
  { ssr: false }
);

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const cinematicLayout = process.env.NEXT_PUBLIC_ZOKU_LAYOUT !== "classic";
  const paletteOpen = useCommandPaletteStore((s) => s.open);
  const togglePalette = useCommandPaletteStore((s) => s.toggle);
  const setPaletteOpen = useCommandPaletteStore((s) => s.setOpen);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isBrandRoute(pathname)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
        return;
      }
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !shouldIgnoreShortcutTarget(e.target)
      ) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, togglePalette, setPaletteOpen]);

  return (
    <div className={`relative z-[1] flex min-h-full flex-col ${cinematicLayout && showZokuMobileNav(pathname) ? "zoku-has-mobile-nav" : ""}`}>
      <AmbientBackground />
      <div
        key={pathname}
        className="page-route-transition relative z-[1] flex min-h-full flex-1 flex-col"
      >
        {children}
      </div>
      <SiteFooter />
      {paletteOpen && <CommandPalette />}
      <QuickTrailerHost />
    </div>
  );
}
