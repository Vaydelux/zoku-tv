"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Tv,
  Database,
  ExternalLink,
  HardDrive,
  Cloud,
  Shield,
  Wifi,
  WifiOff,
} from "lucide-react";
import { isBrandRoute } from "@/lib/auth-routes";
import { isCloudFirebaseConfigured } from "@/lib/firebase";
import { useSessionStore } from "@/stores";

export function SiteFooter() {
  const pathname = usePathname();
  const currentProfile = useSessionStore((s) => s.currentProfile);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Hide on player + pre-app brand surfaces (splash/auth/profiles)
  if (pathname?.startsWith("/watch") || isBrandRoute(pathname)) return null;

  const catalogLabel =
    currentProfile?.catalogMode === "anime"
      ? "AniList Anime Catalog"
      : "TMDB Movies & TV Catalog";

  return (
    <footer
      className="relative z-10 mt-auto border-t border-white/10 bg-[#05060b]/95 px-4 sm:px-6 lg:px-8 py-8 text-white/70 backdrop-blur-xl transition-colors duration-300"
      data-testid="site-footer"
    >
      <div className="mx-auto w-full space-y-6">
        {/* Top Row: Brand summary + Real App Navigation + Honest Runtime Status */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-start">
          {/* Column 1: Brand & Honest Purpose */}
          <div className="md:col-span-5 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 border border-primary/35 text-primary">
                <Tv className="h-4 w-4" />
              </div>
              <span className="font-display text-sm font-bold tracking-wide text-white">
                ZOKU TV
              </span>
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-white/60">
                Open Web Client
              </span>
            </div>
            <p className="text-xs leading-relaxed text-white/55 max-w-md">
              A client-side entertainment discovery, watchlist, and playback tracking interface. Browse catalog metadata and launch streams from external third-party embed providers.
            </p>
          </div>

          {/* Column 2: Real Application Routes */}
          <nav
            aria-label="Footer navigation"
            className="md:col-span-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/65"
          >
            <Link href="/home" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/discover" className="hover:text-white transition-colors">
              Discover
            </Link>
            <Link href="/search" className="hover:text-white transition-colors">
              Search
            </Link>
            <Link href="/watchlist" className="hover:text-white transition-colors">
              Watchlist
            </Link>
            <Link href="/history" className="hover:text-white transition-colors">
              History
            </Link>
            <Link href="/profiles" className="hover:text-white transition-colors">
              Profiles
            </Link>
            <Link href="/settings" className="hover:text-white transition-colors">
              Settings
            </Link>
          </nav>

          {/* Column 3: Actual Client & Storage Status */}
          <div className="md:col-span-3 flex flex-wrap md:justify-end gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                isOnline
                  ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-400/30 bg-amber-500/10 text-amber-200"
              }`}
              title={
                isOnline
                  ? "Browser reports active network connectivity"
                  : "Browser is offline; only cached shell and local data are available"
              }
            >
              {isOnline ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {isOnline ? "Browser Online" : "Offline Mode"}
            </span>

            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/75"
              title={
                isCloudFirebaseConfigured
                  ? "Profiles and library sync with Firebase Authentication & Firestore"
                  : "Firebase env keys not configured; data is stored locally in this browser"
              }
            >
              {isCloudFirebaseConfigured ? (
                <>
                  <Cloud className="h-3 w-3 text-sky-400" />
                  Cloud Sync
                </>
              ) : (
                <>
                  <HardDrive className="h-3 w-3 text-amber-300" />
                  Local Storage Mode
                </>
              )}
            </span>

            {currentProfile?.kidMode && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                <Shield className="h-3 w-3" />
                Kids Mode Active
              </span>
            )}
          </div>
        </div>

        {/* Bottom Row: Transparent Disclaimers & Data Attribution */}
        <div className="border-t border-white/10 pt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between text-[11px] leading-relaxed text-white/45">
          <div className="space-y-1 max-w-4xl">
            <p>
              <strong className="font-semibold text-white/70">
                External Streaming Transparency:
              </strong>{" "}
              Zoku TV does not host, upload, transcode, or store any video or audio files. Playback pages embed unmodified third-party iframes; stream availability, video resolution, audio tracks, and advertisements are controlled solely by those external providers.
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1 text-white/65 font-medium">
                <Database className="h-3 w-3 text-primary" />
                Metadata Sources:
              </span>
              <span>
                Active mode: <strong className="text-white/70">{catalogLabel}</strong>. Movie &amp; TV data provided by{" "}
                <a
                  href="https://www.themoviedb.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-white/25 hover:text-white inline-flex items-center gap-0.5"
                >
                  TMDB <ExternalLink className="h-2.5 w-2.5" />
                </a>{" "}
                (this product uses the TMDB API but is not endorsed or certified by TMDB). Anime data provided by{" "}
                <a
                  href="https://anilist.co/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-white/25 hover:text-white inline-flex items-center gap-0.5"
                >
                  AniList <ExternalLink className="h-2.5 w-2.5" />
                </a>
                .
              </span>
            </p>
          </div>

          <div className="shrink-0 lg:text-right text-[11px] text-white/40">
            <p>Zoku TV · Personal Streaming Portal</p>
            <p>Built with Next.js, TypeScript &amp; Tailwind CSS</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
