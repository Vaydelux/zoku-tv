"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Search, 
  Tv, 
  LogOut, 
  Settings, 
  Heart, 
  User, 
  ChevronDown, 
  Clapperboard,
  Wifi,
  WifiOff
} from "lucide-react";
import { useSessionStore, useRailFilterStore, useSearchHistoryStore, logout } from "@/stores";
import { ProfileAvatarDisplay } from "@/components/ProfileAvatarDisplay";
import { getNavbarNetworkStatus } from "@/lib/network-status";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import { SearchAutocompleteDropdown } from "@/components/SearchAutocompleteDropdown";
import { useDropdownViewportClamp } from "@/hooks/useDropdownViewportClamp";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profiles, currentProfile, setProfile } = useSessionStore();
  const { activeFilter, filterOptions, setActiveFilter } = useRailFilterStore();
  const { addQuery } = useSearchHistoryStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNavAutocomplete, setShowNavAutocomplete] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const statusPopoverRef = useRef<HTMLDivElement>(null);

  useDropdownViewportClamp(isDropdownOpen, profileMenuRef);
  useDropdownViewportClamp(isStatusPopoverOpen, statusPopoverRef);

  // Track browser online/offline state
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setIsStatusPopoverOpen(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Close dropdowns on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusPopoverOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
        setIsStatusPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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

  const navLinks = [
    { name: "Home", href: "/home" },
    { name: "Discover", href: "/discover" },
    { name: "Watchlist", href: "/watchlist" },
  ];

  const catalogMode = currentProfile?.catalogMode ?? "tmdb";
  const catalogLabel = catalogMode === "anime" ? "Anime" : "Movies & TV";
  const networkStatus = getNavbarNetworkStatus(isOnline);

  return (
    <nav
      className={`site-nav sticky top-0 z-40 w-full border-b ${networkStatus.navBorderClass} bg-background/90 backdrop-blur-md transition-colors duration-300`}
    >
      <div className="mx-auto w-full px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Main Nav */}
          <div className="flex min-w-0 items-center gap-4 lg:gap-8">
            <Link href="/home" className="flex shrink-0 flex-col gap-0.5 text-on-surface focus:outline-none">
              <span className="flex items-center gap-1.5 sm:gap-2">
                <Tv className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
                <span className="font-display text-lg sm:text-xl font-bold tracking-wider text-on-surface">
                  ZOKU<span className="text-primary font-mono text-xs sm:text-sm ml-0.5">TV</span>
                </span>
              </span>
              <span className="hidden xs:block pl-6 sm:pl-8 text-[8px] sm:text-[9px] font-mono uppercase tracking-widest text-on-surface-variant truncate">
                {catalogLabel}
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      isActive ? "text-primary border-b-2 border-primary py-1" : "text-on-surface-variant"
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
            
            {/* Subtle Connectivity Status Indicator */}
            <div className={`relative ${isStatusPopoverOpen ? "z-50" : "z-20"}`} ref={statusRef}>
              <button
                type="button"
                role="status"
                aria-live="polite"
                aria-label={`Network status: ${networkStatus.label}. ${networkStatus.description}`}
                title={networkStatus.description}
                data-testid="navbar-connection-indicator"
                data-connection-state={networkStatus.state}
                onClick={() => setIsStatusPopoverOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 sm:px-2.5 font-mono text-[9px] sm:text-[10px] font-medium uppercase tracking-wider transition-all duration-300 ${networkStatus.badgeToneClass}`}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full ${networkStatus.pingColorClass} ${
                      networkStatus.isOffline ? "animate-ping" : "opacity-60"
                    }`}
                  />
                  <span
                    data-testid="navbar-connection-dot"
                    className={`relative inline-flex h-2 w-2 rounded-full transition-colors duration-300 ${networkStatus.dotColorClass}`}
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

              {isStatusPopoverOpen && (
                <div
                  ref={statusPopoverRef}
                  role="dialog"
                  aria-label="Connection state details"
                  className="glass-panel absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border-custom bg-surface/95 p-3.5 shadow-2xl backdrop-blur-2xl z-50 animate-scale-up"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${networkStatus.dotColorClass}`}
                    />
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-on-surface">
                      {networkStatus.isOffline
                        ? "Offline-Only State Active"
                        : "Online & Synchronized"}
                    </p>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">
                    {networkStatus.description}
                  </p>
                </div>
              )}
            </div>

            {/* Search Bar with Voice Input & Real-time Autocomplete */}
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

            {/* Mobile Voice & Search Buttons */}
            <div className="flex items-center gap-1 sm:hidden">
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
              <div className={`relative ${isDropdownOpen ? "z-50" : "z-20"}`} ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="theme-panel flex items-center gap-2 rounded-full p-1 pr-2.5 hover:border-primary/60 transition-all duration-300"
                >
                  <ProfileAvatarDisplay
                    avatar={currentProfile.avatar}
                    avatarColor={currentProfile.avatarColor}
                    name={currentProfile.name}
                    size="sm"
                    className="!h-8 !w-8 !rounded-full border-2 border-primary"
                  />
                  <span className="hidden md:inline text-xs font-semibold max-w-[100px] truncate">
                    {currentProfile.name}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-primary transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isDropdownOpen && (
                  <div
                    ref={profileMenuRef}
                    className="glass-panel absolute right-0 mt-2 w-60 max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-4.75rem)] overflow-y-auto rounded-2xl border border-border-custom bg-surface/95 p-2 shadow-2xl backdrop-blur-2xl animate-scale-up z-50"
                  >
                    <div className="px-3 py-2.5 border-b border-border-custom">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Active Profile</p>
                      <p className="text-sm font-bold text-on-surface truncate mt-0.5">{currentProfile.name}</p>
                      <p className="text-[10px] font-mono text-primary mt-0.5">{catalogLabel} catalog</p>
                    </div>

                    {/* Profiles Selection */}
                    {profiles.length > 1 && (
                      <div className="py-1.5 border-b border-border-custom">
                        <p className="px-3 py-1 text-[10px] uppercase font-mono tracking-wider text-on-surface-variant">Switch Profile</p>
                        {profiles
                          .filter((p) => p.id !== currentProfile.id)
                          .map((p) => (
                            <button
                              key={p.id}
                              onClick={() => handleProfileSwitch(p)}
                              className="w-full flex items-center gap-3 px-3 py-1.5 text-xs text-left text-on-surface hover:bg-surface-hover hover:text-primary rounded-xl transition-colors"
                            >
                              <ProfileAvatarDisplay
                                avatar={p.avatar}
                                avatarColor={p.avatarColor}
                                name={p.name}
                                size="sm"
                                className="!h-6 !w-6 !rounded-full"
                              />
                              <span className="truncate font-medium">{p.name}</span>
                            </button>
                          ))}
                      </div>
                    )}

                    {/* Action Links */}
                    <div className="py-1.5 space-y-0.5">
                      <Link
                        href="/profiles"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover hover:text-primary rounded-xl transition-colors"
                      >
                        <User className="h-4 w-4 text-primary/80" />
                        <span>Manage Profiles</span>
                      </Link>
                      <Link
                        href="/settings?section=catalog"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover hover:text-primary rounded-xl transition-colors"
                      >
                        <Clapperboard className="h-4 w-4 text-primary/80" />
                        <span>Switch Catalog</span>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover hover:text-primary rounded-xl transition-colors"
                      >
                        <Settings className="h-4 w-4 text-primary/80" />
                        <span>Settings</span>
                      </Link>
                      <Link
                        href="/watchlist"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover hover:text-primary rounded-xl transition-colors"
                      >
                        <Heart className="h-4 w-4 text-primary/80" />
                        <span>My Watchlist</span>
                      </Link>
                      <Link
                        href="/watchlist?tab=history"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-on-surface hover:bg-surface-hover hover:text-primary rounded-xl transition-colors"
                      >
                        <Clapperboard className="h-4 w-4 text-primary/80" />
                        <span>Watch History</span>
                      </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-border-custom pt-1.5 mt-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left text-red-400 hover:bg-red-500/15 rounded-xl transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Responsive Mobile Navigation Row (< md) */}
        <div className="flex md:hidden items-center justify-around gap-1 border-t border-border-custom/60 py-1.5">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-primary-contrast shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-hover hover:text-on-surface"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Compact, touch-friendly scrollable rail filter interface on small screens (< md) */}
        {pathname === "/home" && filterOptions.length > 0 && (
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
    </nav>
  );
}
