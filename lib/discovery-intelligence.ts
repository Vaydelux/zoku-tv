import type { WatchHistoryItem } from "@/lib/watch-history";
import type { ContinueWatchingItem } from "@/lib/continue-watching";
import type { AniListMediaDetail } from "@/lib/anilist";

export interface BecauseYouWatchedAnchor {
  catalogMode: "tmdb" | "anime";
  mediaType: "movie" | "tv" | "anime";
  id: number;
  title: string;
  completed: boolean;
  progressPercent: number;
}

export interface NewEpisodeRadarStatus {
  hasNewEpisode: boolean;
  highestWatchedEpisode: number;
  latestAiredEpisode: number | null;
  nextUnreadEpisode: number | null;
  newEpisodeCount: number;
  badgeText: string | null;
}

/**
 * Selects the highest-signal watched title in the active catalog to anchor
 * the "Because You Watched [Title]" personalized home rail.
 */
export function selectBecauseYouWatchedAnchor(
  historyItems: WatchHistoryItem[],
  continueWatchingItems: ContinueWatchingItem[],
  catalogMode: "tmdb" | "anime"
): BecauseYouWatchedAnchor | null {
  type ScoredCandidate = {
    anchor: BecauseYouWatchedAnchor;
    score: number;
    timestamp: number;
  };

  const candidates = new Map<string, ScoredCandidate>();

  const parseTimestamp = (raw?: string | null): number => {
    if (!raw) return 0;
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? ms : 0;
  };

  for (const h of historyItems) {
    if (catalogMode === "anime" && h.media_type !== "anime") continue;
    if (catalogMode === "tmdb" && h.media_type === "anime") continue;

    const id = h.media_type === "anime" ? Number(h.anilistId ?? 0) : Number(h.tmdbId ?? 0);
    if (!Number.isSafeInteger(id) || id <= 0 || !h.title?.trim()) continue;

    const progress = Math.max(0, Math.min(100, Math.round(h.progress_percent ?? 0)));
    const completed = Boolean(h.completed || progress >= 85);
    const watchCount = Math.max(1, h.watch_count ?? 1);
    const ts = parseTimestamp(h.last_watched_at);

    // Completed titles or titles with >= 35% engagement are strong recommendation anchors
    if (!completed && progress < 35) continue;

    const score = (completed ? 100 : progress) + Math.min(30, watchCount * 8);
    const key = `${h.media_type}_${id}`;

    candidates.set(key, {
      anchor: {
        catalogMode,
        mediaType: h.media_type,
        id,
        title: h.title.trim(),
        completed,
        progressPercent: progress,
      },
      score,
      timestamp: ts,
    });
  }

  for (const cw of continueWatchingItems) {
    if (catalogMode === "anime" && cw.media_type !== "anime") continue;
    if (catalogMode === "tmdb" && cw.media_type === "anime") continue;

    const id = cw.media_type === "anime" ? Number(cw.anilistId ?? 0) : Number(cw.tmdbId ?? 0);
    if (!Number.isSafeInteger(id) || id <= 0 || !cw.title?.trim()) continue;

    const progress = Math.max(0, Math.min(100, Math.round(cw.progress_percent ?? 0)));
    if (progress < 35) continue;

    const key = `${cw.media_type}_${id}`;
    if (candidates.has(key)) continue;

    candidates.set(key, {
      anchor: {
        catalogMode,
        mediaType: cw.media_type,
        id,
        title: cw.title.trim(),
        completed: progress >= 90,
        progressPercent: progress,
      },
      score: progress,
      timestamp: parseTimestamp(cw.last_watched_at),
    });
  }

  if (candidates.size === 0) return null;

  const sorted = Array.from(candidates.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.timestamp - a.timestamp;
  });

  return sorted[0]?.anchor ?? null;
}

/**
 * Deduplicates and filters recommendation items so the anchor title and
 * already-watched titles are excluded from the "Because You Watched" rail.
 */
export function filterBecauseYouWatchedRecommendations<T extends { id: number }>(
  recommendations: T[],
  anchorId: number,
  watchedIds: ReadonlySet<number>,
  maxItems = 16
): T[] {
  const seen = new Set<number>([anchorId]);
  const output: T[] = [];

  for (const item of recommendations) {
    if (!item || typeof item.id !== "number" || item.id <= 0) continue;
    if (seen.has(item.id) || watchedIds.has(item.id)) continue;
    seen.add(item.id);
    output.push(item);
    if (output.length >= maxItems) break;
  }

  return output;
}

/**
 * Computes the latest actually aired episode number for an AniList media entry.
 * If the show has a `nextAiringEpisode` (e.g. Episode 8 airing in 3 days),
 * then Episode 7 is the latest aired episode.
 */
export function deriveLatestAiredAnimeEpisode(
  media: Pick<AniListMediaDetail, "episodes" | "status" | "nextAiringEpisode">
): number | null {
  if (media.nextAiringEpisode && typeof media.nextAiringEpisode.episode === "number") {
    const aired = media.nextAiringEpisode.episode - 1;
    return aired >= 1 ? aired : null;
  }
  const status = (media.status || "").toUpperCase();
  if (
    (status === "FINISHED" || status === "RELEASING") &&
    typeof media.episodes === "number" &&
    media.episodes >= 1
  ) {
    return media.episodes;
  }
  return null;
}

/**
 * Evaluates whether a tracked episodic series has aired a newer episode beyond
 * the viewer's highest watched episode.
 */
export function evaluateNewEpisodeRadar(params: {
  highestWatchedEpisode: number;
  latestAiredEpisode: number | null | undefined;
}): NewEpisodeRadarStatus {
  const watched = Math.max(0, Math.floor(params.highestWatchedEpisode || 0));
  const latest =
    typeof params.latestAiredEpisode === "number" && params.latestAiredEpisode >= 1
      ? Math.floor(params.latestAiredEpisode)
      : null;

  if (watched < 1 || latest === null || latest <= watched) {
    return {
      hasNewEpisode: false,
      highestWatchedEpisode: watched,
      latestAiredEpisode: latest,
      nextUnreadEpisode: null,
      newEpisodeCount: 0,
      badgeText: null,
    };
  }

  const diff = latest - watched;
  const nextEp = watched + 1;
  const badgeText = diff === 1 ? `New Ep ${nextEp}` : `New Ep ${nextEp} (+${diff})`;

  return {
    hasNewEpisode: true,
    highestWatchedEpisode: watched,
    latestAiredEpisode: latest,
    nextUnreadEpisode: nextEp,
    newEpisodeCount: diff,
    badgeText,
  };
}

const radarLatestEpisodeCache = new Map<string, number | null>();

export async function resolveNewEpisodeRadarForTrackedItem(params: {
  mediaType: "movie" | "tv" | "anime";
  tmdbId?: number | null;
  anilistId?: number | null;
  season?: number | null;
  episode?: number | null;
  fetchAnimeLatest?: (anilistId: number) => Promise<number | null>;
  fetchTvLatest?: (tmdbId: number, season: number) => Promise<number | null>;
}): Promise<NewEpisodeRadarStatus> {
  const watchedEp = Math.max(0, Math.floor(params.episode ?? 0));
  if (watchedEp < 1 || params.mediaType === "movie") {
    return evaluateNewEpisodeRadar({
      highestWatchedEpisode: watchedEp,
      latestAiredEpisode: null,
    });
  }

  const cacheKey =
    params.mediaType === "anime"
      ? `anime_${params.anilistId ?? 0}`
      : `tv_${params.tmdbId ?? 0}_s_${params.season ?? 1}`;

  if (radarLatestEpisodeCache.has(cacheKey)) {
    return evaluateNewEpisodeRadar({
      highestWatchedEpisode: watchedEp,
      latestAiredEpisode: radarLatestEpisodeCache.get(cacheKey) ?? null,
    });
  }

  let latestAired: number | null = null;
  try {
    if (params.mediaType === "anime" && params.anilistId && params.fetchAnimeLatest) {
      latestAired = await params.fetchAnimeLatest(params.anilistId);
    } else if (params.mediaType === "tv" && params.tmdbId && params.fetchTvLatest) {
      latestAired = await params.fetchTvLatest(params.tmdbId, params.season ?? 1);
    }
    radarLatestEpisodeCache.set(cacheKey, latestAired);
  } catch {
    // Fail quietly on network error
  }

  return evaluateNewEpisodeRadar({
    highestWatchedEpisode: watchedEp,
    latestAiredEpisode: latestAired,
  });
}

