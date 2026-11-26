"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { shouldHideZokuFooter } from "@/lib/site-footer-routing";
import { isCloudFirebaseConfigured } from "@/lib/firebase";
import { useSessionStore } from "@/stores";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { BrandMark } from "@/components/BrandMark";

export function SiteFooter() {
  const pathname = usePathname();
  const currentProfile = useSessionStore((s) => s.currentProfile);
  const isOnline = useOnlineStatus();

  if (shouldHideZokuFooter(pathname)) return null;

  const catalogLabel =
    currentProfile?.catalogMode === "anime"
      ? "AniList Anime Catalog"
      : "TMDB Movies & TV Catalog";

  return (
    <footer
      className="zoku-reference-footer relative z-10 mt-auto px-[var(--cinematic-gutter)] pt-8 pb-6 text-on-surface-variant"
      data-testid="site-footer"
    >
      <div className="liquid-glass-subtle mx-auto w-full max-w-[1320px] rounded-[24px] px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <Link
              href="/home"
              className="inline-flex w-fit items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <BrandMark size="sm" />
            </Link>
            <span className="hidden sm:inline text-border-custom" aria-hidden="true">
              ·
            </span>
            <span className="truncate text-xs text-on-surface-variant">
              Movies, TV, and Anime · iOS Liquid Glass Portal
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium">
            <span className="text-on-surface-variant/80">Metadata by TMDB &amp; AniList</span>
            <Link href="/genres" className="hover:text-primary transition-colors">
              Genres
            </Link>
            <Link href="/settings?section=servers" className="hover:text-primary transition-colors">
              Servers
            </Link>
            <Link href="/settings" className="hover:text-primary transition-colors">
              Settings
            </Link>
          </div>
        </div>

        <details className="mt-3.5 border-t border-[var(--glass-border)] pt-3 text-[11px]">
          <summary className="w-fit cursor-pointer rounded text-on-surface-variant hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            Streaming, catalog, and connection information
          </summary>
          <div className="mt-3 grid gap-2 leading-relaxed sm:grid-cols-2">
            <p>
              Zoku TV does not host or store streamed videos. External playback availability,
              quality, captions, and advertisements depend on the providers used.
            </p>
            <p>
              Catalog: {catalogLabel}. This product uses TMDB metadata but is not endorsed or
              certified by TMDB. Anime metadata is from AniList. Browser{" "}
              {isOnline ? "online" : "offline"};{" "}
              {isCloudFirebaseConfigured
                ? "cloud sync configured"
                : "local-only profile storage"}
              .{currentProfile?.kidMode ? " Kids Mode active." : ""}
            </p>
          </div>
        </details>
      </div>
    </footer>
  );
}
