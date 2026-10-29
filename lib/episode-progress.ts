import type { MediaType } from "@/lib/media-types";

export const EPISODE_COMPLETION_THRESHOLD_PERCENT = 90;

export interface EpisodeProgressRecord {
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
}

export type EpisodeProgressUpsertInput = {
  media_type: "tv" | "anime";
  tmdbId?: number | null;
  anilistId?: number | null;
  season: number;
  episode: number;
  progress_percent?: number | null;
  current_time_sec?: number | null;
  duration_sec?: number | null;
  completed?: boolean;
  updated_at?: string;
};

export function episodeProgressKey(
  media_type: "tv" | "anime",
  id: number,
  season: number,
  episode: number
): string {
  return `${media_type}_${id}_s${season}_e${episode}`;
}

export function episodeProgressStorageKey(profileId: string): string {
  return `zoku_episode_progress_${profileId}`;
}

export function readLocalEpisodeProgress(
  profileId: string
): Record<string, EpisodeProgressRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(episodeProgressStorageKey(profileId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, EpisodeProgressRecord>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeLocalEpisodeProgress(
  profileId: string,
  records: Record<string, EpisodeProgressRecord>
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(episodeProgressStorageKey(profileId), JSON.stringify(records));
  } catch {
    // Ignore quota issues in private browsing
  }
}

export function upsertEpisodeProgressRecord(
  existingRecords: Record<string, EpisodeProgressRecord>,
  input: EpisodeProgressUpsertInput,
  nowIso: string = new Date().toISOString()
): {
  key: string;
  record: EpisodeProgressRecord;
  records: Record<string, EpisodeProgressRecord>;
} | null {
  const id = input.media_type === "anime" ? input.anilistId : input.tmdbId;
  if (!id) return null;

  const key = episodeProgressKey(input.media_type, id, input.season, input.episode);
  const previous = existingRecords[key];

  const rawPercent =
    input.progress_percent != null
      ? input.progress_percent
      : previous?.progress_percent ?? 0;

  const isCompleted =
    input.completed === true ||
    rawPercent >= EPISODE_COMPLETION_THRESHOLD_PERCENT ||
    (previous?.completed === true && input.completed !== false && rawPercent >= EPISODE_COMPLETION_THRESHOLD_PERCENT);

  const normalizedPercent = isCompleted
    ? 100
    : Math.max(0, Math.min(99, Math.round(rawPercent)));

  const record: EpisodeProgressRecord = {
    media_type: input.media_type,
    tmdbId: input.media_type === "anime" ? null : (input.tmdbId ?? previous?.tmdbId ?? null),
    anilistId: input.media_type === "anime" ? (input.anilistId ?? previous?.anilistId ?? null) : null,
    season: input.season,
    episode: input.episode,
    progress_percent: normalizedPercent,
    current_time_sec: isCompleted ? 0 : Math.max(0, Math.round(input.current_time_sec ?? previous?.current_time_sec ?? 0)),
    duration_sec: input.duration_sec ?? previous?.duration_sec ?? null,
    completed: isCompleted,
    updated_at: input.updated_at ?? nowIso,
  };

  const nextRecords = {
    ...existingRecords,
    [key]: record,
  };

  return { key, record, records: nextRecords };
}

export function resetEpisodeProgressRecord(
  existingRecords: Record<string, EpisodeProgressRecord>,
  media_type: "tv" | "anime",
  id: number,
  season: number,
  episode: number,
  nowIso: string = new Date().toISOString()
): {
  key: string;
  record: EpisodeProgressRecord;
  records: Record<string, EpisodeProgressRecord>;
} {
  const key = episodeProgressKey(media_type, id, season, episode);
  const previous = existingRecords[key];

  const record: EpisodeProgressRecord = {
    media_type,
    tmdbId: media_type === "anime" ? null : id,
    anilistId: media_type === "anime" ? id : null,
    season,
    episode,
    progress_percent: 0,
    current_time_sec: 0,
    duration_sec: previous?.duration_sec ?? null,
    completed: false,
    updated_at: nowIso,
  };

  return {
    key,
    record,
    records: {
      ...existingRecords,
      [key]: record,
    },
  };
}

export function mergeEpisodeProgress(
  local: Record<string, EpisodeProgressRecord>,
  cloud: EpisodeProgressRecord[]
): Record<string, EpisodeProgressRecord> {
  const merged: Record<string, EpisodeProgressRecord> = { ...local };

  for (const entry of cloud) {
    const id = entry.media_type === "anime" ? entry.anilistId : entry.tmdbId;
    if (!id) continue;
    const key = episodeProgressKey(entry.media_type, id, entry.season, entry.episode);
    const existing = merged[key];

    if (!existing) {
      merged[key] = entry;
      continue;
    }

    const cloudTs = Date.parse(entry.updated_at || "");
    const localTs = Date.parse(existing.updated_at || "");

    if (Number.isNaN(localTs) || cloudTs >= localTs) {
      merged[key] = entry;
    }
  }

  return merged;
}
