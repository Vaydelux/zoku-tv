import type { CatalogMode, MediaType } from "@/lib/media-types";

export type ProfileDoc = {
  id?: string;
  name: string;
  avatar: string;
  avatarColor?: string;
  kidMode: boolean;
  themePreference: string;
  /** Light or dark shell for the selected color theme */
  appearancePreference?: "dark" | "light";
  iframeModePreference: "Strict" | "Compatibility";
  catalogMode: CatalogMode;
  homeGenreRailPreferences: number[];
  createdAt?: string;
  updatedAt?: string;
};

export type WatchlistDoc = {
  media_type: MediaType;
  tmdbId?: number | null;
  anilistId?: number | null;
  added_at: string;
  title?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
};

export type SearchHistoryDoc = {
  history: string[];
  updatedAt?: string;
};

export type ContinueWatchingDoc = {
  media_type: MediaType;
  tmdbId?: number | null;
  anilistId?: number | null;
  season?: number | null;
  episode?: number | null;
  title: string;
  overview?: string | null;
  vote_average?: number | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  last_watched_at: string;
  progress_percent?: number | null;
  current_time_sec?: number | null;
  duration_sec?: number | null;
};
