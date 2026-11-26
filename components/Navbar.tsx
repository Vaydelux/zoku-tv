"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Sun,
  Moon,
  LogOut,
  Settings,
  Heart,
  User,
  ChevronDown,
  Clapperboard,
  Zap,
  Server,
  Command,
  FolderHeart,
} from "lucide-react";
import {
  useSessionStore,
  useCommandPaletteStore,
  useDynamicIslandStore,
  logout,
} from "@/stores";
import { BrandMark } from "@/components/BrandMark";
import { ProfileAvatarDisplay } from "@/components/ProfileAvatarDisplay";
import { FloatingMenu } from "@/components/ui/FloatingMenu";
import { DynamicIsland } from "@/components/DynamicIsland";
import { usePerfMode } from "@/hooks/usePerfMode";
import { normalizeAppearance } from "@/lib/themes";
import { ZOKU_NAV_ITEMS, activeZokuNavHref } from "@/lib/design-navigation";
import { MobileTabBar } from "@/components/MobileTabBar";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profiles, currentProfile, setProfile, updateProfile } = useSessionStore();
  const { is60FpsActive, togglePerfMode } = usePerfMode();
  const pushActivity = useDynamicIslandStore((s) => s.pushActivity);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleProfileSwitch = (p: any) => {
    setProfile(p);
    setIsDropdownOpen(false);
    pushActivity(`Switched to ${p.name}`, { detail: "Profile active", tone: "accent" });
    router.push("/home");
  };

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };

  if (["/login", "/signup", "/profiles", "/"].includes(pathname)) {
    return null;
  }

  const activeNav = activeZokuNavHref(pathname);
  const desktopNavLinks = ZOKU_NAV_ITEMS.filter((item) => item.href !== "/search");
  const catalogMode = currentProfile?.catalogMode ?? "tmdb";
  const catalogLabel = catalogMode === "anime" ? "Anime" : "Movies & TV";
  const appearance = normalizeAppearance(currentProfile?.appearancePreference);

  const toggleAppearance = () => {
    if (!currentProfile) return;
    const next = appearance === "dark" ? "light" : "dark";
    pushActivity(next === "light" ? "Light Glass Mode" : "Dark Obsidian Glass", {
      detail: "Appearance updated",
      tone: "accent",
    });
    void updateProfile(currentProfile.id, { appearancePreference: next });
  };

  const isHeroOverlayRoute = pathname === "/home";

  return (
    <>
      <header
        className={`site-nav ${
          isHeroOverlayRoute ? "fixed top-0 inset-x-0" : "sticky top-0 w-full"
        } z-40 transition-all duration-300 ${
          isScrolled || !isHeroOverlayRoute
            ? "border-b border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-[var(--glass-shadow)] backdrop-blur-2xl"
            : "border-b border-transparent bg-gradient-to-b from-background/80 via-background/35 to-transparent"
        }`}
      >
        <div className="mx-auto w-full px-3 sm:px-5 lg:px-[var(--cinematic-gutter)]">
          <div className="grid h-16 sm:h-[70px] grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
            {/* Left: Brand + Frosted Segmented Pill Nav */}
            <div className="flex min-w-0 items-center gap-3 xl:gap-5">
              <Link
                href="/home"
                aria-label="Zoku TV Home"
                className="zoku-brand-lockup inline-flex shrink-0 items-center rounded-full py-1 pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <BrandMark size="md" />
              </Link>

              <nav
                aria-label="Primary navigation"
                className="zoku-primary-nav hidden lg:inline-flex items-center gap-0.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-1 backdrop-blur-xl"
              >
                {desktopNavLinks.map((link) => {
                  const isActive = activeNav === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`zoku-nav-link rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-primary text-primary-contrast shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-on-surface/[0.06]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Center: Signature Floating iOS 27/28 Dynamic Island */}
            <div className="flex items-center justify-center">
              <DynamicIsland />
            </div>

            {/* Right: Search + ⌘K Spotlight Pill, Theme Toggle, Profile Glass Capsule */}
            <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
              {/* Desktop Search + Spotlight Capsule */}
              <div className="hidden sm:inline-flex items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-0.5 backdrop-blur-xl">
                <Link
                  href="/search"
                  aria-label="Search titles"
                  data-tv-focusable="true"
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors ${
                    activeNav === "/search"
                      ? "bg-primary text-primary-contrast"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden xl:inline">Search</span>
                </Link>
                <button
                  type="button"
                  onClick={() => useCommandPaletteStore.getState().setOpen(true)}
                  aria-label="Open Spotlight Command Palette"
                  data-testid="navbar-spotlight-trigger"
                  data-tv-focusable="true"
                  className="inline-flex h-8 items-center gap-1 rounded-full px-2 font-mono text-[10px] font-semibold text-on-surface-variant hover:bg-on-surface/10 hover:text-on-surface transition-colors"
                >
                  <Command className="h-3 w-3" aria-hidden="true" />
                  <span>K</span>
                </button>
              </div>

              {/* Mobile Search Orb */}
              <Link
                href="/search"
                aria-label="Search titles"
                data-tv-focusable="true"
                className="sm:hidden liquid-glass-pill inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </Link>

              {/* Quick Light/Dark Liquid Glass Orb */}
              {currentProfile && (
                <button
                  type="button"
                  onClick={toggleAppearance}
                  aria-label={`Switch to ${appearance === "dark" ? "light" : "dark"} mode`}
                  title={`Switch to ${appearance === "dark" ? "light" : "dark"} glass mode`}
                  data-testid="navbar-appearance-toggle"
                  data-tv-focusable="true"
                  className="hidden md:inline-flex liquid-glass-pill h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:text-primary"
                >
                  {appearance === "dark" ? (
                    <Sun className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Moon className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              )}

              {/* Profile Glass Capsule */}
              {currentProfile && (
                <div className="zoku-profile-control shrink-0">
                  <button
                    ref={profileTriggerRef}
                    type="button"
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    aria-label={`Profile menu for ${currentProfile.name}`}
                    aria-controls="zoku-profile-popover"
                    aria-expanded={isDropdownOpen}
                    data-tv-focusable="true"
                    className={`zoku-dropdown-trigger liquid-glass-pill inline-flex h-9 sm:h-10 items-center gap-2 rounded-full p-1 pr-2 sm:pr-3 ${
                      isDropdownOpen ? "ring-2 ring-primary/45 border-primary" : ""
                    }`}
                  >
                    <ProfileAvatarDisplay
                      avatar={currentProfile.avatar}
                      avatarColor={currentProfile.avatarColor}
                      name={currentProfile.name}
                      size="sm"
                      className="!h-7 !w-7 !rounded-full"
                    />
                    <span className="hidden xl:inline text-xs font-semibold text-on-surface max-w-[92px] truncate">
                      {currentProfile.name}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-on-surface-variant transition-transform duration-200 ${
                        isDropdownOpen ? "rotate-180 text-primary" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  <FloatingMenu
                    open={isDropdownOpen}
                    anchorRef={profileTriggerRef}
                    onClose={() => setIsDropdownOpen(false)}
                    id="zoku-profile-popover"
                    role="menu"
                    ariaLabel={`Profile menu for ${currentProfile.name}`}
                    align="right"
                    minWidth={252}
                    maxWidth={276}
                    preferredMaxHeight={540}
                    className="p-2.5"
                  >
                    <div className="px-3 py-2.5 border-b border-[var(--glass-border)]">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                        Active Profile
                      </p>
                      <p className="text-sm font-bold text-on-surface truncate mt-0.5">
                        {currentProfile.name}
                      </p>
                      <p className="text-[11px] font-semibold text-primary mt-0.5">
                        {catalogLabel} catalog
                      </p>
                    </div>

                    {profiles.length > 1 && (
                      <div className="py-1.5 border-b border-[var(--glass-border)] space-y-0.5">
                        <p className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                          Switch Profile
                        </p>
                        {profiles
                          .filter((p) => p.id !== currentProfile.id)
                          .map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              role="menuitem"
                              onClick={() => handleProfileSwitch(p)}
                              className="zoku-menu-item flex min-h-[38px] w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-on-surface hover:bg-on-surface/[0.07] transition-colors"
                            >
                              <ProfileAvatarDisplay
                                avatar={p.avatar}
                                avatarColor={p.avatarColor}
                                name={p.name}
                                size="sm"
                                className="!h-6 !w-6 !rounded-full"
                              />
                              <span className="truncate">{p.name}</span>
                            </button>
                          ))}
                      </div>
                    )}

                    <div className="py-1.5 border-b border-[var(--glass-border)] space-y-0.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={toggleAppearance}
                        className="zoku-menu-item flex min-h-[38px] w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-on-surface/[0.07] transition-colors"
                      >
                        <span className="inline-flex items-center gap-2.5">
                          {appearance === "dark" ? (
                            <Sun className="h-4 w-4 text-primary" aria-hidden="true" />
                          ) : (
                            <Moon className="h-4 w-4 text-primary" aria-hidden="true" />
                          )}
                          <span>Appearance</span>
                        </span>
                        <span className="rounded-full bg-on-surface/[0.08] px-2 py-0.5 font-mono text-[10px] uppercase text-on-surface-variant">
                          {appearance}
                        </span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={togglePerfMode}
                        data-testid="navbar-perf-mode-toggle"
                        aria-pressed={is60FpsActive}
                        className="zoku-menu-item flex min-h-[38px] w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-on-surface/[0.07] transition-colors"
                      >
                        <span className="inline-flex items-center gap-2.5">
                          <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                          <span>TV 60fps Mode</span>
                        </span>
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                          {is60FpsActive ? "ON" : "OFF"}
                        </span>
                      </button>
                    </div>

                    <div className="py-1.5 space-y-0.5">
                      <button
                        type="button"
                        role="menuitem"
                        data-testid="navbar-quick-jump-btn"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          useCommandPaletteStore.getState().setOpen(true);
                        }}
                        className="zoku-menu-item flex min-h-[38px] w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-on-surface/[0.07] transition-colors"
                      >
                        <span className="inline-flex items-center gap-2.5">
                          <Command className="h-4 w-4 text-primary/85" aria-hidden="true" />
                          <span>Spotlight Jump</span>
                        </span>
                        <kbd className="rounded-md border border-[var(--glass-border)] bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant">
                          ⌘K
                        </kbd>
                      </button>
                      <Link
                        href="/profiles"
                        role="menuitem"
                        onClick={() => setIsDropdownOpen(false)}
                        className="zoku-menu-item flex min-h-[38px] items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-on-surface/[0.07] transition-colors"
                      >
                        <User className="h-4 w-4 text-primary/85" aria-hidden="true" />
                        <span>Manage Profiles</span>
                      </Link>
                      <Link
                        href="/settings?section=catalog"
                        role="menuitem"
                        onClick={() => setIsDropdownOpen(false)}
                        className="zoku-menu-item flex min-h-[38px] items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-on-surface/[0.07] transition-colors"
                      >
                        <Clapperboard className="h-4 w-4 text-primary/85" aria-hidden="true" />
                        <span>Switch Catalog</span>
                      </Link>
                      <Link
                        href="/settings?section=servers"
                        role="menuitem"
                        onClick={() => setIsDropdownOpen(false)}
                        className="zoku-menu-item flex min-h-[38px] items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-on-surface/[0.07] transition-colors"
                      >
                        <Server className="h-4 w-4 text-primary/85" aria-hidden="true" />
                        <span>Playback Servers</span>
                      </Link>
                      <Link
                        href="/settings"
                        role="menuitem"
                        onClick={() => setIsDropdownOpen(false)}
                        className="zoku-menu-item flex min-h-[38px] items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-on-surface/[0.07] transition-colors"
                      >
                        <Settings className="h-4 w-4 text-primary/85" aria-hidden="true" />
                        <span>Settings</span>
                      </Link>
                      <Link
                        href="/watchlist"
                        role="menuitem"
                        onClick={() => setIsDropdownOpen(false)}
                        className="zoku-menu-item flex min-h-[38px] items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-on-surface/[0.07] transition-colors"
                      >
                        <Heart className="h-4 w-4 text-primary/85" aria-hidden="true" />
                        <span>My Watchlist</span>
                      </Link>
                      <Link
                        href="/watchlist?tab=collections"
                        role="menuitem"
                        onClick={() => setIsDropdownOpen(false)}
                        className="zoku-menu-item flex min-h-[38px] items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-on-surface/[0.07] transition-colors"
                      >
                        <FolderHeart className="h-4 w-4 text-primary/85" aria-hidden="true" />
                        <span>Collections &amp; Backup</span>
                      </Link>
                    </div>

                    <div className="border-t border-[var(--glass-border)] pt-1.5 mt-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        className="zoku-menu-item flex min-h-[38px] w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-red-500 hover:bg-red-500/12 transition-colors"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </FloatingMenu>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <MobileTabBar pathname={pathname} />
    </>
  );
}
