"use client";

import Link from "next/link";
import { Bookmark, Compass, Home, Search, Settings, type LucideIcon } from "lucide-react";
import { ZOKU_NAV_ITEMS, activeZokuNavHref, showZokuMobileNav, type ZokuNavHref } from "@/lib/design-navigation";

const ICONS: Record<ZokuNavHref, LucideIcon> = {
  "/home": Home,
  "/search": Search,
  "/genres": Compass,
  "/watchlist": Bookmark,
  "/settings": Settings,
};

/** Shared mobile/tablet presentation. Kept outside the sticky header to
 * preserve viewport-fixed positioning and safe-area behavior on iOS/Android.
 */
export function MobileTabBar({ pathname }: { pathname: string | null }) {
  if (!showZokuMobileNav(pathname)) return null;
  const activeHref = activeZokuNavHref(pathname);

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="zoku-mobile-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-border-custom bg-background/95 lg:hidden"
    >
      <div className="grid grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]">
        {ZOKU_NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.href];
          const active = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              data-tv-focusable="true"
              className={`zoku-mobile-tab flex min-h-[60px] min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors ${active ? "text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
