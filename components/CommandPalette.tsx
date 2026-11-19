"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Home,
  Compass,
  Bookmark,
  History,
  Server,
  Settings,
  CalendarClock,
  FolderHeart,
  Zap,
  Film,
  Tv,
  Sparkles,
  Loader2,
  X,
  CornerDownLeft,
} from "lucide-react";
import {
  useCommandPaletteStore,
  useSessionStore,
} from "@/stores";
import { searchMulti, type TMDBTitle } from "@/lib/tmdb";
import {
  searchAnime,
  getAnimeDisplayTitle,
  getAnimePoster,
  type AniListMedia,
} from "@/lib/anilist";
import {
  filterTmdbForKidsMode,
  filterAnimeForKidsMode,
} from "@/lib/kids-mode";
import { usePerfMode } from "@/hooks/usePerfMode";

interface PaletteItem {
  id: string;
  group: "Actions" | "Movies & TV" | "Anime";
  title: string;
  subtitle: string;
  icon: "home" | "genres" | "discover" | "schedule" | "watchlist" | "history" | "collections" | "servers" | "settings" | "perf" | "movie" | "tv" | "anime";
  posterUrl?: string | null;
  onSelect: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { open, setOpen } = useCommandPaletteStore();
  const { currentProfile } = useSessionStore();
  const { is60FpsActive, togglePerfMode } = usePerfMode();
  const isKidMode = Boolean(currentProfile?.kidMode);

  const [query, setQuery] = useState("");
  const [tmdbResults, setTmdbResults] = useState<TMDBTitle[]>([]);
  const [animeResults, setAnimeResults] = useState<AniListMedia[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setTmdbResults([]);
      setAnimeResults([]);
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus?.();
      previousFocusRef.current = null;
    }
  }, [open]);

  // Debounced cross-catalog search
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setTmdbResults([]);
      setAnimeResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const [tmdbList, animePage] = await Promise.all([
          searchMulti(trimmed, 1).catch(() => [] as TMDBTitle[]),
          searchAnime(trimmed, 1, 6).catch(() => ({ media: [] as AniListMedia[] })),
        ]);
        if (cancelled) return;
        const cleanTmdb = filterTmdbForKidsMode(
          (tmdbList || []).filter(
            (r): r is TMDBTitle =>
              Boolean(r && typeof r.id === "number") &&
              (r.media_type === "movie" || r.media_type === "tv")
          ),
          isKidMode
        ).slice(0, 5);
        const cleanAnime = filterAnimeForKidsMode(
          animePage.media || [],
          isKidMode
        ).slice(0, 5);
        setTmdbResults(cleanTmdb);
        setAnimeResults(cleanAnime);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query, isKidMode]);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const quickActions = useMemo<PaletteItem[]>(() => {
    const base: PaletteItem[] = [
      {
        id: "act-home",
        group: "Actions",
        title: "Home Feed",
        subtitle: "Continue watching, trending, and genre rails",
        icon: "home",
        onSelect: () => navigate("/home"),
      },
      {
        id: "act-genres",
        group: "Actions",
        title: "Browse Genres",
        subtitle: "Explore movies, TV shows, and anime by genre",
        icon: "genres",
        onSelect: () => navigate("/genres"),
      },
      {
        id: "act-discover",
        group: "Actions",
        title: "Advanced Discover",
        subtitle: "Filter by year, rating, language, and sort order",
        icon: "discover",
        onSelect: () => navigate("/discover"),
      },
      {
        id: "act-schedule",
        group: "Actions",
        title: "7-Day Anime Airing Schedule",
        subtitle: "Live countdowns and local episode airtimes",
        icon: "schedule",
        onSelect: () => navigate("/discover?type=anime&view=schedule"),
      },
      {
        id: "act-watchlist",
        group: "Actions",
        title: "My Watchlist",
        subtitle: "Saved titles and analytics",
        icon: "watchlist",
        onSelect: () => navigate("/watchlist"),
      },
      {
        id: "act-collections",
        group: "Actions",
        title: "Custom Collections & Library Backup",
        subtitle: "Organize lists or export/import library JSON",
        icon: "collections",
        onSelect: () => navigate("/watchlist?tab=collections"),
      },
      {
        id: "act-history",
        group: "Actions",
        title: "Watch History",
        subtitle: "Recently watched movies, episodes, and anime",
        icon: "history",
        onSelect: () => navigate("/watchlist?tab=history"),
      },
      {
        id: "act-servers",
        group: "Actions",
        title: "Playback Servers & JSON Sync",
        subtitle: "Pick built-in providers or add custom HTTPS mirrors",
        icon: "servers",
        onSelect: () => navigate("/settings?section=servers"),
      },
      {
        id: "act-perf",
        group: "Actions",
        title: is60FpsActive ? "Disable 60fps TV Mode" : "Enable 60fps TV Mode",
        subtitle: "Optimize transitions for Android TV and virtual mouse",
        icon: "perf",
        onSelect: () => {
          togglePerfMode();
          setOpen(false);
        },
      },
      {
        id: "act-settings",
        group: "Actions",
        title: "Settings & 18 Themes",
        subtitle: "Themes, profiles, Kids Mode, and diagnostics",
        icon: "settings",
        onSelect: () => navigate("/settings"),
      },
    ];

    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    );
  }, [query, is60FpsActive, togglePerfMode]);

  const items = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [];

    for (const item of tmdbResults) {
      const type = item.media_type === "tv" ? "tv" : "movie";
      const label = item.title || item.name || "Untitled";
      const year = (item.release_date || item.first_air_date || "").slice(0, 4);
      const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
      list.push({
        id: `tmdb-${type}-${item.id}`,
        group: "Movies & TV",
        title: label,
        subtitle: [type === "tv" ? "TV Series" : "Movie", year, rating ? `★ ${rating}` : ""]
          .filter(Boolean)
          .join(" · "),
        icon: type,
        posterUrl: item.poster_path
          ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
          : null,
        onSelect: () => navigate(`/title/${type}/${item.id}`),
      });
    }

    for (const anime of animeResults) {
      const label = getAnimeDisplayTitle(anime);
      const year = anime.seasonYear ? String(anime.seasonYear) : "";
      const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
      list.push({
        id: `anime-${anime.id}`,
        group: "Anime",
        title: label,
        subtitle: ["Anime", year, anime.episodes ? `${anime.episodes} EP` : "", rating ? `★ ${rating}` : ""]
          .filter(Boolean)
          .join(" · "),
        icon: "anime",
        posterUrl: getAnimePoster(anime),
        onSelect: () => navigate(`/anime/${anime.id}`),
      });
    }

    return [...list, ...quickActions];
  }, [tmdbResults, animeResults, quickActions]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, items.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          items.length ? (prev <= 0 ? items.length - 1 : prev - 1) : 0
        );
      } else if (e.key === "Enter") {
        const selected = items[activeIndex];
        if (selected) {
          e.preventDefault();
          selected.onSelect();
        } else if (query.trim()) {
          e.preventDefault();
          navigate(`/search?q=${encodeURIComponent(query.trim())}`);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, items, activeIndex, query, setOpen]);

  if (!open) return null;

  const renderIcon = (icon: PaletteItem["icon"]) => {
    const cls = "h-4 w-4 shrink-0 text-primary";
    switch (icon) {
      case "home": return <Home className={cls} aria-hidden="true" />;
      case "genres": return <Compass className={cls} aria-hidden="true" />;
      case "discover": return <Search className={cls} aria-hidden="true" />;
      case "schedule": return <CalendarClock className={cls} aria-hidden="true" />;
      case "watchlist": return <Bookmark className={cls} aria-hidden="true" />;
      case "history": return <History className={cls} aria-hidden="true" />;
      case "collections": return <FolderHeart className={cls} aria-hidden="true" />;
      case "servers": return <Server className={cls} aria-hidden="true" />;
      case "perf": return <Zap className={cls} aria-hidden="true" />;
      case "movie": return <Film className={cls} aria-hidden="true" />;
      case "tv": return <Tv className={cls} aria-hidden="true" />;
      case "anime": return <Sparkles className={cls} aria-hidden="true" />;
      default: return <Settings className={cls} aria-hidden="true" />;
    }
  };

  const groups: PaletteItem["group"][] = ["Movies & TV", "Anime", "Actions"];

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-start justify-center sm:pt-[11vh] bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Quick jump command palette"
      data-testid="command-palette-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-t-3xl sm:rounded-2xl border border-border-custom bg-surface shadow-2xl flex flex-col max-h-[82dvh]">
        {/* Search Input Row */}
        <div className="flex items-center gap-3 border-b border-border-custom focus-within:border-primary/60 transition-colors px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, TV shows, anime, or jump anywhere..."
            aria-label="Search titles or commands"
            className="flex-1 bg-transparent text-sm sm:text-base text-on-surface placeholder:text-on-surface-variant !outline-none focus:!outline-none focus-visible:!outline-none !ring-0"
          />
          {searching && (
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close command palette"
            data-tv-focusable="true"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-background hover:text-on-surface transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Results & Actions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
          {items.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-semibold text-on-surface">
                No instant matches for &ldquo;{query.trim()}&rdquo;
              </p>
              {query.trim() && (
                <button
                  type="button"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(query.trim())}`)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-contrast hover:opacity-90"
                >
                  Open full Search page
                  <CornerDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          ) : (
            groups.map((group) => {
              const groupItems = items.filter((item) => item.group === group);
              if (groupItems.length === 0) return null;
              return (
                <div key={group} className="space-y-1">
                  <p className="px-3 pt-1 text-[11px] font-medium text-on-surface-variant">
                    {group}
                  </p>
                  {groupItems.map((item) => {
                    const globalIdx = items.indexOf(item);
                    const isActive = globalIdx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-tv-focusable="true"
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        onClick={item.onSelect}
                        className={`w-full min-h-[48px] flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                          isActive
                            ? "bg-primary/15 text-on-surface ring-1 ring-primary/40"
                            : "text-on-surface hover:bg-background/70"
                        }`}
                      >
                        {item.posterUrl ? (
                          <img
                            src={item.posterUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-11 w-8 shrink-0 rounded-md object-cover bg-background border border-border-custom"
                          />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background border border-border-custom">
                            {renderIcon(item.icon)}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-on-surface truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-on-surface-variant truncate">
                            {item.subtitle}
                          </p>
                        </div>
                        {isActive && (
                          <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Quiet Footer Hint */}
        <div className="hidden sm:flex items-center justify-between border-t border-border-custom bg-background/60 px-4 py-2 text-[11px] text-on-surface-variant">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="font-mono font-semibold text-on-surface">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="font-mono font-semibold text-on-surface">↵</kbd> Open
            </span>
            <span>
              <kbd className="font-mono font-semibold text-on-surface">Esc</kbd> Close
            </span>
          </div>
          {query.trim() && (
            <button
              type="button"
              onClick={() => navigate(`/search?q=${encodeURIComponent(query.trim())}`)}
              className="font-semibold text-primary hover:underline"
            >
              See all results for &ldquo;{query.trim()}&rdquo;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
