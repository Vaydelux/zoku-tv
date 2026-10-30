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
  creator?: string | null;
  genres?: string[] | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string | null;
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

export type WatchHistoryDoc = {
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
  completed: boolean;
  watch_count: number;
};

export type EpisodeProgressDoc = {
  media_type: "tv" | "anime";
  tmdbId?: number | null;
  anilistId?: number | null;
  season: number;
  episode: number;
  progress_percent: number;
  current_time_sec: number;
  duration_sec?: number | null;
  completed: boolean;
  updated_at: string;
};
