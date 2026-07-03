export type ProfileDoc = {
  id?: string;
  name: string;
  avatar: string;
  avatarColor?: string;
  kidMode: boolean;
  themePreference: string;
  iframeModePreference: "Strict" | "Compatibility";
  homeGenreRailPreferences: number[];
  createdAt?: string;
  updatedAt?: string;
};

export type WatchlistDoc = {
  tmdbId: number;
  media_type: "movie" | "tv";
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
