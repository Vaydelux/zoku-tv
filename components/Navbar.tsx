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
  Grid, 
  ChevronDown, 
  ShieldAlert, 
  FolderHeart 
} from "lucide-react";
import { useSessionStore, logout } from "@/stores";
import { ProfileAvatarDisplay } from "@/components/ProfileAvatarDisplay";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profiles, currentProfile, setProfile } = useSessionStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
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

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border-custom bg-background/80 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-8">
            <Link href="/home" className="flex items-center gap-2 text-primary focus:outline-none">
              <Tv className="h-6 w-6 animate-pulse" />
              <span className="font-display text-xl font-bold tracking-wider text-on-surface">
                ZOKU<span className="text-primary font-mono text-sm ml-0.5">TV</span>
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

          {/* Search, Notifications & Profile */}
          <div className="flex items-center gap-4">
            
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
              <input
                type="text"
                placeholder="Titles, people, genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 lg:w-64 rounded-full border border-border-custom bg-surface py-1.5 pl-4 pr-10 text-xs text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-300"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors">
                <Search className="h-4 w-4" />
              </button>
            </form>

            {/* Mobile Search Button */}
            <button 
              onClick={() => router.push("/search")}
              className="p-1.5 sm:hidden rounded-full hover:bg-surface text-on-surface transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Profile Menu Dropdown */}
            {currentProfile && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 rounded-full p-1 hover:bg-surface border border-border-custom transition-all duration-300"
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
                  <ChevronDown className={`h-4 w-4 text-on-surface-variant transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border-custom bg-surface p-2 shadow-2xl animate-scale-up z-50">
                    <div className="px-3 py-2 border-b border-border-custom">
                      <p className="text-xs text-on-surface-variant">Active Profile</p>
                      <p className="text-sm font-bold text-on-surface truncate">{currentProfile.name}</p>
                    </div>

                    {/* Profiles Selection */}
                    {profiles.length > 1 && (
                      <div className="py-1 border-b border-border-custom">
                        <p className="px-3 py-1 text-[10px] uppercase font-mono tracking-wider text-on-surface-variant">Switch Profile</p>
                        {profiles
                          .filter((p) => p.id !== currentProfile.id)
                          .map((p) => (
                            <button
                              key={p.id}
                              onClick={() => handleProfileSwitch(p)}
                              className="w-full flex items-center gap-3 px-3 py-1.5 text-xs text-left text-on-surface hover:bg-surface-hover hover:text-primary rounded-lg transition-colors"
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

                    {/* Action Links */}
                    <div className="py-1">
                      <Link
                        href="/profiles"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-on-surface hover:bg-surface-hover hover:text-primary rounded-lg transition-colors"
                      >
                        <User className="h-4 w-4" />
                        <span>Manage Profiles</span>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-on-surface hover:bg-surface-hover hover:text-primary rounded-lg transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                      <Link
                        href="/watchlist"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-on-surface hover:bg-surface-hover hover:text-primary rounded-lg transition-colors"
                      >
                        <Heart className="h-4 w-4" />
                        <span>My Watchlist</span>
                      </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-border-custom pt-1 mt-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
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
      </div>
    </nav>
  );
}
