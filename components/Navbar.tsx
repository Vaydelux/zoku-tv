"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Search, 
  Play,
  Sun,
  Moon,
  Tv, 
  LogOut, 
  Settings, 
  Heart, 
  User, 
  ChevronDown, 
  Clapperboard,
  Wifi,
  WifiOff,
  Zap,
  Server,
  Command,
  FolderHeart,
} from "lucide-react";
import {
  useSessionStore,
  useRailFilterStore,
  useSearchHistoryStore,
  useCommandPaletteStore,
  logout,
} from "@/stores";
import { BrandMark } from "@/components/BrandMark";
import { ProfileAvatarDisplay } from "@/components/ProfileAvatarDisplay";
import { getNavbarNetworkStatus } from "@/lib/network-status";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import { SearchAutocompleteDropdown } from "@/components/SearchAutocompleteDropdown";
import { FloatingMenu } from "@/components/ui/FloatingMenu";
import { usePerfMode } from "@/hooks/usePerfMode";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { normalizeAppearance } from "@/lib/themes";
import { ZOKU_NAV_ITEMS, activeZokuNavHref } from "@/lib/design-navigation";
import { MobileTabBar } from "@/components/MobileTabBar";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profiles, currentProfile, setProfile, updateProfile } = useSessionStore();
  const { activeFilter, filterOptions, setActiveFilter } = useRailFilterStore();
  const { addQuery } = useSearchHistoryStore();
  const { is60FpsActive, togglePerfMode, isAutoDetectedTvOr32Bit } = usePerfMode();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const isOnline = useOnlineStatus();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNavAutocomplete, setShowNavAutocomplete] = useState(false);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const statusTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOnline) {
      setIsStatusPopoverOpen(false);
    }
  }, [isOnline]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowNavAutocomplete(false);
    const trimmed = searchQuery.trim();
    if (trimmed) {
      void addQuery(trimmed);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleProfileSwitch = (p: any) => {
    setProfile(p);
    setIsDropdownOpen(false);
    router.push("/home");
  };

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };

  // Do not render navbar on login, signup, or profile selection page
  if (["/login", "/signup", "/profiles", "/"].includes(pathname)) {
    return null;
  }

  const cinematicLayout = process.env.NEXT_PUBLIC_ZOKU_LAYOUT !== "classic";
  const activeNav = activeZokuNavHref(pathname);
  const navLinks = cinematicLayout
    ? ZOKU_NAV_ITEMS.map(({ label, href }) => ({ name: label, href }))
    : [
        { name: "Home", href: "/home" },
        { name: "Discover", href: "/discover" },
        { name: "Watchlist", href: "/watchlist" },
      ];

  const catalogMode = currentProfile?.catalogMode ?? "tmdb";
  const catalogLabel = catalogMode === "anime" ? "Anime" : "Movies & TV";
  const appearance = normalizeAppearance(currentProfile?.appearancePreference);
  const toggleAppearance = () => {
    if (!currentProfile) return;
    void updateProfile(currentProfile.id, { appearancePreference: appearance === "dark" ? "light" : "dark" });
  };
  const networkStatus = getNavbarNetworkStatus(isOnline);

  return (
    <>
    <header
      className={`site-nav sticky top-0 z-40 w-full border-b ${networkStatus.navBorderClass} bg-background/90 backdrop-blur-md transition-colors duration-300`}
    >
      <div className="mx-auto w-full px-3 sm:px-6 lg:px-8">
        <div className="flex h-[52px] sm:h-16 items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Main Nav */}
          <div className="flex min-w-0 items-center gap-4 lg:gap-8">
            <Link
              href="/home"
              aria-label="Zoku TV Home"
              className="zoku-brand-lockup inline-flex shrink-0 items-center rounded-lg py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <BrandMark size="md" />
            </Link>

            <div className={cinematicLayout ? "zoku-primary-nav hidden lg:flex items-center gap-1" : "zoku-primary-nav hidden md:flex items-center gap-6"} role="navigation" aria-label="Primary navigation">
              {navLinks.map((link) => {
                const isActive = cinematicLayout ? activeNav === link.href : pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`zoku-nav-link relative rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-primary ${
                      isActive ? "zoku-nav-link-active text-on-surface" : "text-on-surface-variant"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Search, Connectivity Status Indicator & Profile */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            
            {/* Connectivity Indicator: show inline only when offline in cinematic layout, or always in classic */}
            {(!cinematicLayout || networkStatus.isOffline) && (
            <div className="zoku-status-control shrink-0">
              <button
                ref={statusTriggerRef}
                type="button"
                role="status"
                aria-live="polite"
                aria-label={`Network status: ${networkStatus.label}. ${networkStatus.description}`}
                title={networkStatus.description}
                data-testid="navbar-connection-indicator"
                data-connection-state={networkStatus.state}
                onClick={() => setIsStatusPopoverOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 sm:px-2.5 font-mono text-[9px] sm:text-[10px] font-medium uppercase tracking-wider transition-all duration-200 ${networkStatus.badgeToneClass}`}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full ${networkStatus.pingColorClass} ${
                      networkStatus.isOffline ? "animate-ping" : "opacity-60"
                    }`}
                  />
                  <span
                    data-testid="navbar-connection-dot"
                    className={`relative inline-flex h-2 w-2 rounded-full transition-colors duration-200 ${networkStatus.dotColorClass}`}
                  />
                </span>
                {networkStatus.isOffline ? (
                  <WifiOff className="h-3 w-3 shrink-0" />
                ) : (
                  <Wifi className="hidden h-3 w-3 shrink-0 lg:inline-block" />
                )}
                <span className="hidden sm:inline">{networkStatus.label}</span>
                <span className="sm:hidden">{networkStatus.shortLabel}</span>
              </button>

              <FloatingMenu
                open={isStatusPopoverOpen}
                anchorRef={statusTriggerRef}
                onClose={() => setIsStatusPopoverOpen(false)}
                role="dialog"
                ariaLabel="Connection state details"
                align="right"
                minWidth={256}
                maxWidth={280}
                preferredMaxHeight={220}
                className="p-3.5"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${networkStatus.dotColorClass}`} />
                  <p className="text-xs font-semibold text-on-surface">
                    {networkStatus.isOffline
                      ? "Offline-Only State Active"
                      : "Online & Synchronized"}
                  </p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">
                  {networkStatus.description}
                </p>
              </FloatingMenu>
            </div>
            )}

            {/* 60fps TV / Virtual Mouse Butter Mode Quick Toggle (inline in classic, inside profile menu in cinematic) */}
            {!cinematicLayout && (
            <button
              type="button"
              onClick={togglePerfMode}
              data-testid="navbar-perf-mode-toggle"
              aria-pressed={is60FpsActive}
              aria-label={
                is60FpsActive
                  ? "60fps Butter Mode active. Click to switch to Standard visuals"
                  : "Enable 60fps Butter Mode for Android TV and virtual mouse browsers"
              }
              title={
                is60FpsActive
                  ? `60fps Butter Mode Active${isAutoDetectedTvOr32Bit ? " (TV/32-bit Auto-Detected)" : ""} — Click to toggle`
                  : "Enable 60fps Butter Mode (GPU-composited transitions & 32-bit TV optimization)"
              }
              className={`zoku-perf-control inline-flex items-center gap-1 rounded-lg border px-2 py-1 sm:px-2.5 font-mono text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider transition-[transform,border-color,background-color,color] duration-150 active:scale-95 ${
                is60FpsActive
                  ? "border-primary/60 bg-primary/15 text-primary shadow-sm"
                  : "border-border-custom bg-surface/80 text-on-surface-variant hover:border-primary/45 hover:text-on-surface"
              }`}
            >
              <Zap
                className={`h-3 w-3 shrink-0 ${
                  is60FpsActive ? "fill-primary text-primary" : "text-on-surface-variant"
                }`}
              />
              <span>{is60FpsActive ? "60FPS ON" : "60FPS"}</span>
            </button>
            )}

            {/* Search Bar with Voice Input & Real-time Autocomplete */}
            {cinematicLayout ? (
              <Link href="/search" aria-label="Search titles" data-tv-focusable="true" className="zoku-header-icon inline-flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-hover hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <Search className="h-[19px] w-[19px]" aria-hidden="true" />
              </Link>
            ) : (
            <form onSubmit={handleSearchSubmit} className={`relative hidden sm:block ${showNavAutocomplete ? "z-50" : "z-20"}`}>
              <input
                type="text"
                placeholder={catalogMode === "anime" ? "Search anime..." : "Titles, people, genres..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowNavAutocomplete(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) {
                    setShowNavAutocomplete(true);
                  }
                }}
                className="w-48 md:w-56 lg:w-64 rounded-full border border-border-custom bg-surface/85 py-1.5 pl-4 pr-16 text-xs text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-md transition-all duration-300"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <VoiceSearchButton
                  size="sm"
                  onTranscript={(text) => {
                    const trimmed = text.trim();
                    setSearchQuery(text);
                    setShowNavAutocomplete(false);
                    if (trimmed) {
                      void addQuery(trimmed);
                    }
                    router.push(`/search?q=${encodeURIComponent(text)}`);
                  }}
                />
                <button
                  type="submit"
                  aria-label="Submit search"
                  className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Real-time Autocomplete Dropdown */}
              <SearchAutocompleteDropdown
                query={searchQuery}
                isOpen={showNavAutocomplete}
                onClose={() => setShowNavAutocomplete(false)}
                className="w-72 md:w-80 right-0 left-auto"
                onSelectSuggestion={(suggestion) => {
                  setShowNavAutocomplete(false);
                  setSearchQuery("");
                  if (suggestion.title.trim()) {
                    void addQuery(suggestion.title.trim());
                  }
                  router.push(suggestion.href);
                }}
                onViewAll={(q) => {
                  setShowNavAutocomplete(false);
                  setSearchQuery("");
                  if (q.trim()) {
                    void addQuery(q.trim());
                  }
                  router.push(`/search?q=${encodeURIComponent(q)}`);
                }}
              />
            </form>
            )}

            {cinematicLayout && (
              <button type="button" onClick={toggleAppearance}
                aria-label={appearance === "dark" ? "Use light appearance" : "Use dark appearance"}
                title={appearance === "dark" ? "Use light appearance" : "Use dark appearance"}
                className="zoku-header-icon inline-flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-hover hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                {appearance === "dark" ? <Sun className="h-[19px] w-[19px]" /> : <Moon className="h-[19px] w-[19px]" />}
              </button>
            )}

            {/* Mobile Voice & Search Buttons */}
            <div className={`items-center gap-1 sm:hidden ${cinematicLayout ? "hidden" : "flex"}`}>
              <VoiceSearchButton
                size="sm"
                className="rounded-xl border border-border-custom bg-surface/75"
                onTranscript={(text) => {
                  if (text.trim()) {
                    void addQuery(text.trim());
                  }
                  router.push(`/search?q=${encodeURIComponent(text)}`);
                }}
              />
              <button 
                onClick={() => router.push("/search")}
                aria-label="Open search"
                className="p-2 rounded-xl border border-border-custom bg-surface/75 hover:bg-surface text-on-surface transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            {/* Profile Menu Dropdown */}
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
                  className={`zoku-dropdown-trigger inline-flex h-10 items-center gap-2 rounded-full border p-1 pr-2.5 transition-colors ${
                    isDropdownOpen
                      ? "border-primary bg-surface ring-1 ring-primary/35"
                      : "border-border-custom bg-surface hover:border-primary/60 hover:bg-surface-hover"
                  }`}
                >
                  <ProfileAvatarDisplay
                    avatar={currentProfile.avatar}
                    avatarColor={currentProfile.avatarColor}
                    name={currentProfile.name}
                    size="sm"
                    className="!h-7 !w-7 !rounded-full"
                  />
                  <span className="hidden md:inline text-xs font-semibold text-on-surface max-w-[96px] truncate">
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
                  minWidth={244}
                  maxWidth={268}
                  preferredMaxHeight={520}
                  className="p-2"
                >
                  <div className="px-2.5 py-2 border-b border-border-custom/70">
                    <p className="text-[11px] font-medium text-on-surface-variant">Active profile</p>
                    <p className="text-sm font-bold text-on-surface truncate mt-0.5">{currentProfile.name}</p>
                    <p className="text-[11px] font-medium text-primary mt-0.5">{catalogLabel} catalog</p>
                  </div>

                  {/* Profiles Selection */}
                  {profiles.length > 1 && (
                    <div className="py-1.5 border-b border-border-custom/70 space-y-0.5">
                      <p className="px-2.5 py-1 text-[11px] font-medium text-on-surface-variant">Switch profile</p>
                      {profiles
                        .filter((p) => p.id !== currentProfile.id)
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            role="menuitem"
                            onClick={() => handleProfileSwitch(p)}
                            className="zoku-menu-item flex min-h-[38px] w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors"
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

                  {cinematicLayout && (
                    <div className="py-1.5 border-b border-border-custom/70">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={togglePerfMode}
                        data-testid="navbar-perf-mode-toggle"
                        aria-pressed={is60FpsActive}
                        className="zoku-menu-item flex min-h-[38px] w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors"
                      >
                        <span className="inline-flex items-center gap-2.5">
                          <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                          <span>TV 60fps Mode</span>
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-primary">
                          {is60FpsActive ? "ON" : "OFF"}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Action Links */}
                  <div className="py-1.5 space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      data-testid="navbar-quick-jump-btn"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        useCommandPaletteStore.getState().setOpen(true);
                      }}
                      className="zoku-menu-item flex min-h-[38px] w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Command className="h-4 w-4 text-primary/85" aria-hidden="true" />
                        <span>Quick Jump</span>
                      </span>
                      <kbd className="rounded border border-border-custom bg-background px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant">
                        Ctrl+K
                      </kbd>
                    </button>
                    <Link
                      href="/profiles"
                      role="menuitem"
                      onClick={() => setIsDropdownOpen(false)}
                      className="zoku-menu-item flex min-h-[38px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors"
                    >
                      <User className="h-4 w-4 text-primary/85" aria-hidden="true" />
                      <span>Manage Profiles</span>
                    </Link>
                    <Link
                      href="/settings?section=catalog"
                      role="menuitem"
                      onClick={() => setIsDropdownOpen(false)}
                      className="zoku-menu-item flex min-h-[38px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors"
                    >
                      <Clapperboard className="h-4 w-4 text-primary/85" aria-hidden="true" />
                      <span>Switch Catalog</span>
                    </Link>
                    <Link
                      href="/settings?section=servers"
                      role="menuitem"
                      onClick={() => setIsDropdownOpen(false)}
                      className="zoku-menu-item flex min-h-[38px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors"
                    >
                      <Server className="h-4 w-4 text-primary/85" aria-hidden="true" />
                      <span>Playback Servers</span>
                    </Link>
                    <Link
                      href="/settings"
                      role="menuitem"
                      onClick={() => setIsDropdownOpen(false)}
                      className="zoku-menu-item flex min-h-[38px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors"
                    >
                      <Settings className="h-4 w-4 text-primary/85" aria-hidden="true" />
                      <span>Settings</span>
                    </Link>
                    <Link
                      href="/watchlist"
                      role="menuitem"
                      onClick={() => setIsDropdownOpen(false)}
                      className="zoku-menu-item flex min-h-[38px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors"
                    >
                      <Heart className="h-4 w-4 text-primary/85" aria-hidden="true" />
                      <span>My Watchlist</span>
                    </Link>
                    <Link
                      href="/watchlist?tab=collections"
                      role="menuitem"
                      onClick={() => setIsDropdownOpen(false)}
                      className="zoku-menu-item flex min-h-[38px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors"
                    >
                      <FolderHeart className="h-4 w-4 text-primary/85" aria-hidden="true" />
                      <span>Collections &amp; Backup</span>
                    </Link>
                    <Link
                      href="/watchlist?tab=history"
                      role="menuitem"
                      onClick={() => setIsDropdownOpen(false)}
                      className="zoku-menu-item flex min-h-[38px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover transition-colors"
                    >
                      <Clapperboard className="h-4 w-4 text-primary/85" aria-hidden="true" />
                      <span>Watch History</span>
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-border-custom/70 pt-1.5 mt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="zoku-menu-item flex min-h-[38px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-500 hover:bg-red-500/15 transition-colors"
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

        {!cinematicLayout && (
            <div className="flex md:hidden items-center justify-around gap-1 border-t border-border-custom/60 py-1.5">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link key={link.href} href={link.href}
                    className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition-all ${isActive ? "bg-primary text-primary-contrast shadow-sm" : "text-on-surface-variant hover:bg-surface-hover hover:text-on-surface"}`}
                  >{link.name}</Link>
                );
              })}
            </div>
        )}

        {/* Compact, touch-friendly scrollable rail filter interface on small screens (< md) */}
        {!cinematicLayout && pathname === "/home" && filterOptions.length > 0 && (
          <div
            data-testid="navbar-mobile-rail-filters"
            className="md:hidden custom-scrollbar flex items-center gap-1.5 overflow-x-auto touch-pan-x pt-2 pb-2.5 px-1 border-t border-border-custom/50 scroll-smooth -mx-1"
          >
            {filterOptions.map((chip) => {
              const isActive = activeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveFilter(chip.id)}
                  data-testid={`mobile-navbar-rail-filter-${chip.id}`}
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all whitespace-nowrap active:scale-95 ${
                    isActive
                      ? "bg-primary text-primary-contrast shadow-sm shadow-primary/20"
                      : "theme-panel text-on-surface-variant hover:text-on-surface hover:border-primary/40"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
    {cinematicLayout && <MobileTabBar pathname={pathname} />}
    </>
  );
}
