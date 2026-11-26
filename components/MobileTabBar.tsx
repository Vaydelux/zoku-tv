"use client";

import Link from "next/link";
import { Bookmark, Compass, Home, Search, Settings, type LucideIcon } from "lucide-react";
import {
  ZOKU_NAV_ITEMS,
  activeZokuNavHref,
  showZokuMobileNav,
  type ZokuNavHref,
} from "@/lib/design-navigation";

const ICONS: Record<ZokuNavHref, LucideIcon> = {
  "/home": Home,
  "/search": Search,
  "/genres": Compass,
  "/watchlist": Bookmark,
  "/settings": Settings,
};

/**
 * Detached iOS 27/28 Floating Liquid Glass Pill Dock for mobile & tablet viewports.
 * Floats cleanly above the iOS/Android safe-area inset with active pill elevation.
 */
export function MobileTabBar({ pathname }: { pathname: string | null }) {
  if (!showZokuMobileNav(pathname)) return null;
  const activeHref = activeZokuNavHref(pathname);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <nav
        aria-label="Mobile primary navigation"
        className="zoku-mobile-tabbar pointer-events-auto mx-auto max-w-md rounded-[28px] p-1.5"
      >
        <div className="grid grid-cols-5 gap-1">
          {ZOKU_NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.href];
            const active = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-tv-focusable="true"
                className={`zoku-mobile-tab flex min-h-[50px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[22px] px-1 py-1.5 text-[10px] font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-contrast shadow-md"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-on-surface/[0.06]"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
