"use client";

import { Check, Clapperboard, Save, Tv } from "lucide-react";
import type { CatalogMode } from "@/lib/media-types";
import type { TMDBGenre } from "@/lib/tmdb";
import { getGenreIcon } from "@/lib/genreIcons";

interface CatalogSectionProps {
  localCatalogMode: CatalogMode;
  onSelectCatalog: (mode: CatalogMode) => void;
}

export function CatalogModeSection({
  localCatalogMode,
  onSelectCatalog,
}: CatalogSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-display font-bold text-on-surface tracking-tight">
          Browsing &amp; Content Catalog Mode
        </h2>
        <p className="text-xs text-on-surface-variant">
          Choose which primary catalog this profile browses on Home and Discover.
        </p>
      </div>

      <div className="space-y-3.5">
        <button
          type="button"
          onClick={() => onSelectCatalog("tmdb")}
          className={`w-full text-left p-5 rounded-[22px] border cursor-pointer transition-all flex items-start gap-4 ${
            localCatalogMode === "tmdb"
              ? "border-primary bg-primary/10 ring-1 ring-primary"
              : "border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] hover:border-primary/50"
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Tv className="h-5 w-5" />
          </span>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-on-surface">Movies &amp; TV (TMDB)</h3>
              {localCatalogMode === "tmdb" && (
                <span className="rounded-full bg-primary text-primary-contrast text-[10px] font-bold px-2.5 py-0.5">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Browse trending movies and TV series from TMDB with multi-server embed playback and custom genre rails.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectCatalog("anime")}
          className={`w-full text-left p-5 rounded-[22px] border cursor-pointer transition-all flex items-start gap-4 ${
            localCatalogMode === "anime"
              ? "border-primary bg-primary/10 ring-1 ring-primary"
              : "border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] hover:border-primary/50"
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Clapperboard className="h-5 w-5" />
          </span>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-on-surface">Anime (AniList)</h3>
              {localCatalogMode === "anime" && (
                <span className="rounded-full bg-primary text-primary-contrast text-[10px] font-bold px-2.5 py-0.5">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Browse anime from AniList with franchise timelines, 7-day airing schedules, and dedicated anime embed servers.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

interface GenreRailsSectionProps {
  availableGenres: TMDBGenre[];
  selectedGenreIds: number[];
  genrePreferencesDirty: boolean;
  genreSaveStatus: "idle" | "writing" | "verifying";
  genreSaveError: string | null;
  saving: boolean;
  onToggleGenre: (genreId: number) => void;
  onSelectAll: () => void;
  onResetDefaults: () => void;
  onSave: () => void;
}

export function GenreRailsSection({
  availableGenres,
  selectedGenreIds,
  genrePreferencesDirty,
  genreSaveStatus,
  genreSaveError,
  saving,
  onToggleGenre,
  onSelectAll,
  onResetDefaults,
  onSave,
}: GenreRailsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-display font-bold text-on-surface tracking-tight">
            Home Genre Channels
          </h2>
          <p className="text-xs text-on-surface-variant">
            Select any genre categories to display on your Home dashboard with verified Firestore persistence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={
              saving ||
              (availableGenres.length > 0 && selectedGenreIds.length === availableGenres.length)
            }
            data-testid="select-all-genres-btn"
            className="liquid-glass-pill rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary disabled:opacity-45"
          >
            Select All ({availableGenres.length})
          </button>
          <button
            type="button"
            onClick={onResetDefaults}
            disabled={saving}
            data-testid="reset-default-genres-btn"
            className="liquid-glass-pill rounded-full px-3.5 py-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface"
          >
            Reset Default
          </button>
        </div>
      </div>

      <div className="custom-scrollbar grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto p-3 border border-[var(--glass-border)] rounded-[22px] bg-[var(--glass-bg-subtle)]">
        {availableGenres.map((g) => {
          const isChecked = selectedGenreIds.includes(g.id);
          const GenreIcon = getGenreIcon(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onToggleGenre(g.id)}
              disabled={saving}
              aria-pressed={isChecked}
              className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                isChecked
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-[var(--glass-border)] text-on-surface-variant hover:text-on-surface hover:border-primary/40 bg-background/25"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <GenreIcon
                  className={`h-4 w-4 shrink-0 ${
                    isChecked ? "text-primary" : "text-on-surface-variant"
                  }`}
                />
                <span className="truncate">{g.name}</span>
              </span>
              <span
                className={`h-5 w-5 shrink-0 rounded-full border flex items-center justify-center transition-all ${
                  isChecked
                    ? "bg-primary border-primary text-primary-contrast"
                    : "border-[var(--glass-border-strong)]"
                }`}
              >
                {isChecked && <Check className="h-3 w-3" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--glass-border)]">
        <span data-testid="genre-selected-count" className="text-xs font-mono text-on-surface-variant">
          Selected: <strong className="text-primary">{selectedGenreIds.length}</strong> /{" "}
          {availableGenres.length} Genres
        </span>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !genrePreferencesDirty}
          data-testid="save-genre-rails"
          className="liquid-glass-cta inline-flex items-center gap-2 rounded-full py-2.5 px-6 text-xs font-bold disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>
            {genreSaveStatus === "writing"
              ? "Saving to profile…"
              : genreSaveStatus === "verifying"
              ? "Verifying in Firestore…"
              : "Save Rail Preferences"}
          </span>
        </button>
      </div>

      {genreSaveError && (
        <div
          role="alert"
          data-testid="genre-save-error"
          className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs leading-relaxed text-red-300"
        >
          <strong className="font-semibold">Genre preference save failed.</strong>
          <p className="mt-1">{genreSaveError}</p>
        </div>
      )}
    </div>
  );
}
