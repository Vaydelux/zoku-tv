"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Film, Tv, Star, ArrowRight, Search, Loader2 } from "lucide-react";
import { useSessionStore } from "@/stores";
import {
  fetchRealtimeAutocomplete,
  type AutocompleteSuggestion,
} from "@/lib/autocomplete";
import { useDropdownViewportClamp } from "@/hooks/useDropdownViewportClamp";

interface SearchAutocompleteDropdownProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectSuggestion?: (suggestion: AutocompleteSuggestion) => void;
  onViewAll?: (query: string) => void;
  className?: string;
  maxResults?: number;
}

export function SearchAutocompleteDropdown({
  query,
  isOpen,
  onClose,
  onSelectSuggestion,
  onViewAll,
  className = "",
  maxResults = 7,
}: SearchAutocompleteDropdownProps) {
  const router = useRouter();
  const kidMode = useSessionStore((state) => Boolean(state.currentProfile?.kidMode));
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDropdownVisible = isOpen && query.trim().length >= 2;

  useDropdownViewportClamp(isDropdownVisible, containerRef);

  // Debounced real-time fetch from TMDB & AniList
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await fetchRealtimeAutocomplete(trimmed, maxResults, kidMode);
        if (isMounted) {
          setSuggestions(results);
          setHighlightedIndex(-1);
        }
      } catch (err) {
        console.warn("Autocomplete error:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, maxResults, kidMode]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Keyboard navigation support
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      } else if (e.key === "Enter" && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        e.preventDefault();
        handleItemClick(suggestions[highlightedIndex]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, highlightedIndex, suggestions]);

  const handleItemClick = (suggestion: AutocompleteSuggestion) => {
    onClose();
    if (onSelectSuggestion) {
      onSelectSuggestion(suggestion);
    } else {
      router.push(suggestion.href);
    }
  };

  const handleViewAllClick = () => {
    onClose();
    if (onViewAll) {
      onViewAll(query.trim());
    } else {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  if (!isOpen || query.trim().length < 2) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Search suggestions"
      className={`glass-panel absolute top-full mt-2.5 z-50 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-border-custom bg-surface/95 p-2 shadow-2xl backdrop-blur-2xl transition-all duration-200 animate-fade-in ${
        className ? className : "left-0 right-0 w-full"
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border-custom/80 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
        <span className="flex items-center gap-1.5 text-primary">
          <Sparkles className="h-3 w-3 shrink-0" />
          <span className="truncate">Real-time Suggestions</span>
        </span>
        {loading ? (
          <span className="flex items-center gap-1 shrink-0 text-primary">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            <span>Scanning...</span>
          </span>
        ) : (
          <span className="shrink-0">{suggestions.length} titles</span>
        )}
      </div>

      {/* Suggestions List */}
      <div className="max-h-[min(52dvh,19rem)] overflow-y-auto py-1 divide-y divide-border-custom/40">
        {suggestions.length > 0 ? (
          suggestions.map((item, index) => {
            const isHighlighted = highlightedIndex === index;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleItemClick(item)}
                className={`group flex w-full items-center justify-between gap-3 rounded-xl p-2 text-left transition-colors duration-150 ${
                  isHighlighted
                    ? "bg-primary/15 text-on-surface"
                    : "hover:bg-surface-hover text-on-surface"
                }`}
              >
                {/* Poster Thumbnail */}
                <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md border border-white/10 bg-neutral-900 shadow-sm">
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/40">
                      <Film className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Title & Metadata */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="line-clamp-1 text-xs font-semibold text-on-surface group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant">
                    {item.year && <span>{item.year}</span>}
                    {item.rating && (
                      <span className="flex items-center gap-0.5 text-amber-400">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        <span>{item.rating}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Type Badge */}
                <div className="shrink-0">
                  {item.mediaType === "anime" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2 py-0.5 font-sans text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm border border-fuchsia-300/40">
                      <Sparkles className="h-2 w-2" />
                      <span>Anime</span>
                    </span>
                  ) : item.mediaType === "tv" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider text-sky-300 border border-sky-500/40">
                      <Tv className="h-2 w-2" />
                      <span>TV Show</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/40">
                      <Film className="h-2 w-2" />
                      <span>Movie</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })
        ) : !loading ? (
          <div className="py-4 text-center text-xs text-on-surface-variant">
            <p className="font-semibold">No direct suggestions</p>
            <p className="text-[10px] mt-0.5">Press Enter to search all catalogs</p>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-on-surface-variant space-y-1">
            <Loader2 className="h-4 w-4 animate-spin mx-auto text-primary" />
            <p className="text-[10px]">Retrieving matched titles...</p>
          </div>
        )}
      </div>

      {/* Footer view all results button */}
      <div className="border-t border-border-custom/80 pt-1.5 mt-1">
        <button
          type="button"
          onClick={handleViewAllClick}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" />
            <span>Search all for “{query.trim()}”</span>
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
