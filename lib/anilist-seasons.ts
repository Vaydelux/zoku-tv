import type { AniListMedia, AniListMediaDetail, AniListStreamingEpisode } from "@/lib/anilist";

export type AnimeEpisode = {
  episodeNumber: number;
  title: string;
  thumbnail?: string | null;
};

export type AnimeSeason = {
  seasonNumber: number;
  anilistId: number;
  title: string;
  poster?: string | null;
  episodeCount: number;
  episodes: AnimeEpisode[];
  /** Filmu season param when using franchise root id */
  filmuSeason: number;
};

const FRANCHISE_RELATIONS = new Set(["PREQUEL", "SEQUEL", "SIDE_STORY", "ALTERNATIVE"]);

function mediaStartTimestamp(media: AniListMedia): number {
  const y = media.startDate?.year ?? media.seasonYear ?? 0;
  const m = media.startDate?.month ?? 1;
  const d = media.startDate?.day ?? 1;
  return new Date(y, m - 1, d).getTime();
}

function buildEpisodes(
  count: number,
  streamingEpisodes?: AniListStreamingEpisode[] | null
): AnimeEpisode[] {
  const episodes: AnimeEpisode[] = [];
  const streamCount = streamingEpisodes?.length ?? 0;
  const total = Math.max(count, streamCount, 1);

  for (let i = 1; i <= total; i++) {
    const stream = streamingEpisodes?.[i - 1];
    episodes.push({
      episodeNumber: i,
      title: stream?.title || `Episode ${i}`,
      thumbnail: stream?.thumbnail ?? null,
    });
  }
  return episodes;
}

function collectFranchiseMedia(detail: AniListMediaDetail): AniListMedia[] {
  const map = new Map<number, AniListMedia>();
  map.set(detail.id, detail);

  for (const edge of detail.relations?.edges ?? []) {
    const node = edge.node;
    if (!node || node.type !== "ANIME") continue;
    if (!edge.relationType || !FRANCHISE_RELATIONS.has(edge.relationType)) continue;
    map.set(node.id, node);
  }

  return Array.from(map.values()).sort((a, b) => mediaStartTimestamp(a) - mediaStartTimestamp(b));
}

export function buildAnimeSeasons(detail: AniListMediaDetail): AnimeSeason[] {
  const franchise = collectFranchiseMedia(detail);

  if (franchise.length <= 1) {
    const episodeCount = detail.episodes ?? detail.streamingEpisodes?.length ?? 12;
    return [
      {
        seasonNumber: 1,
        anilistId: detail.id,
        title: detail.title.english || detail.title.romaji || "Season 1",
        poster: detail.coverImage?.large ?? null,
        episodeCount,
        episodes: buildEpisodes(episodeCount, detail.streamingEpisodes),
        filmuSeason: 1,
      },
    ];
  }

  return franchise.map((media, index) => {
    const episodeCount = media.episodes ?? 12;
    const streaming =
      media.id === detail.id ? detail.streamingEpisodes : null;
    return {
      seasonNumber: index + 1,
      anilistId: media.id,
      title: media.title.english || media.title.romaji || `Season ${index + 1}`,
      poster: media.coverImage?.large ?? null,
      episodeCount,
      episodes: buildEpisodes(episodeCount, streaming),
      filmuSeason: 1,
    };
  });
}

export function findSeasonEpisode(
  seasons: AnimeSeason[],
  anilistId: number,
  seasonNum: number,
  episodeNum: number
): { season: AnimeSeason; episode: AnimeEpisode } | null {
  const season =
    seasons.find((s) => s.seasonNumber === seasonNum) ||
    seasons.find((s) => s.anilistId === anilistId) ||
    seasons[0];
  if (!season) return null;
  const episode = season.episodes.find((e) => e.episodeNumber === episodeNum) || season.episodes[0];
  if (!episode) return null;
  return { season, episode };
}

export function getNextEpisode(
  seasons: AnimeSeason[],
  seasonNum: number,
  episodeNum: number
): { season: number; episode: number; anilistId: number } | null {
  const season = seasons.find((s) => s.seasonNumber === seasonNum);
  if (!season) return null;

  if (episodeNum < season.episodes.length) {
    return { season: seasonNum, episode: episodeNum + 1, anilistId: season.anilistId };
  }

  const nextSeason = seasons.find((s) => s.seasonNumber === seasonNum + 1);
  if (nextSeason && nextSeason.episodes.length > 0) {
    return { season: nextSeason.seasonNumber, episode: 1, anilistId: nextSeason.anilistId };
  }
  return null;
}

export function getPreviousEpisode(
  seasons: AnimeSeason[],
  seasonNum: number,
  episodeNum: number
): { season: number; episode: number; anilistId: number } | null {
  const season = seasons.find((s) => s.seasonNumber === seasonNum);
  if (!season) return null;

  if (episodeNum > 1) {
    return { season: seasonNum, episode: episodeNum - 1, anilistId: season.anilistId };
  }

  const prevSeason = seasons.find((s) => s.seasonNumber === seasonNum - 1);
  if (prevSeason && prevSeason.episodes.length > 0) {
    return {
      season: prevSeason.seasonNumber,
      episode: prevSeason.episodes.length,
      anilistId: prevSeason.anilistId,
    };
  }
  return null;
}

export type FranchiseTrack = "main" | "side";
export type FranchiseWatchStatus = "completed" | "in_progress" | "unwatched";

export interface FranchiseProgressSnapshot {
  status: FranchiseWatchStatus;
  lastEpisode?: number | null;
  progressPercent?: number | null;
}

export interface FranchiseTimelineNode {
  anilistId: number;
  title: string;
  format: string;
  relationType: string;
  relationLabel: string;
  track: FranchiseTrack;
  orderIndex: number;
  year: number | null;
  episodes: number | null;
  poster: string | null;
  isCurrent: boolean;
  watchStatus: FranchiseWatchStatus;
  lastWatchedEpisode: number | null;
  progressPercent: number;
}

export interface FranchiseTimeline {
  mainStoryline: FranchiseTimelineNode[];
  sideStoriesAndMovies: FranchiseTimelineNode[];
  totalEntries: number;
  completedEntries: number;
}

const MAIN_RELATIONS = new Set(["PREQUEL", "SEQUEL", "PARENT"]);
const SIDE_FORMATS = new Set(["MOVIE", "OVA", "SPECIAL", "MUSIC"]);
const ALL_TIMELINE_RELATIONS = new Set([
  "PREQUEL",
  "SEQUEL",
  "PARENT",
  "SIDE_STORY",
  "ALTERNATIVE",
  "SPIN_OFF",
  "SUMMARY",
  "FULL_STORY",
]);

function formatRelationLabel(relationType: string, isCurrent: boolean): string {
  if (isCurrent) return "Current Entry";
  switch (relationType.toUpperCase()) {
    case "PREQUEL":
      return "Prequel";
    case "SEQUEL":
      return "Sequel";
    case "PARENT":
      return "Main Story";
    case "SIDE_STORY":
      return "Side Story";
    case "ALTERNATIVE":
      return "Alternative";
    case "SPIN_OFF":
      return "Spin-Off";
    case "SUMMARY":
      return "Recap / Summary";
    case "FULL_STORY":
      return "Full Story";
    default:
      return "Related";
  }
}

export function classifyFranchiseTrack(
  relationType: string,
  format: string | null | undefined,
  isCurrent: boolean
): FranchiseTrack {
  const normRel = (relationType || "").toUpperCase();
  const normFmt = (format || "TV").toUpperCase();

  if (isCurrent) {
    return SIDE_FORMATS.has(normFmt) ? "side" : "main";
  }

  if (SIDE_FORMATS.has(normFmt)) {
    return "side";
  }

  if (MAIN_RELATIONS.has(normRel)) {
    return "main";
  }

  return "side";
}

export function buildFranchiseTimeline(
  detail: AniListMediaDetail,
  progressLookup?: (anilistId: number) => FranchiseProgressSnapshot | null | undefined,
  isKidSafeLookup?: (media: AniListMedia) => boolean
): FranchiseTimeline {
  const entriesMap = new Map<
    number,
    { media: AniListMedia; relationType: string; isCurrent: boolean }
  >();

  entriesMap.set(detail.id, {
    media: detail,
    relationType: "CURRENT",
    isCurrent: true,
  });

  for (const edge of detail.relations?.edges ?? []) {
    const node = edge?.node;
    if (!node || (node.type && node.type !== "ANIME")) continue;
    const rel = (edge.relationType || "").toUpperCase();
    if (!ALL_TIMELINE_RELATIONS.has(rel)) continue;
    if (isKidSafeLookup && !isKidSafeLookup(node)) continue;
    if (!entriesMap.has(node.id)) {
      entriesMap.set(node.id, {
        media: node,
        relationType: rel,
        isCurrent: false,
      });
    }
  }

  const sortedRaw = Array.from(entriesMap.values()).sort((a, b) => {
    const tsDiff = mediaStartTimestamp(a.media) - mediaStartTimestamp(b.media);
    if (tsDiff !== 0) return tsDiff;
    return a.media.id - b.media.id;
  });

  const mainStoryline: FranchiseTimelineNode[] = [];
  const sideStoriesAndMovies: FranchiseTimelineNode[] = [];
  let completedEntries = 0;

  for (const item of sortedRaw) {
    const { media, relationType, isCurrent } = item;
    const track = classifyFranchiseTrack(relationType, media.format, isCurrent);
    const snap = progressLookup ? progressLookup(media.id) : null;
    const watchStatus: FranchiseWatchStatus = snap?.status ?? "unwatched";
    if (watchStatus === "completed") {
      completedEntries += 1;
    }

    const year = media.startDate?.year ?? media.seasonYear ?? null;
    const node: FranchiseTimelineNode = {
      anilistId: media.id,
      title: media.title.english || media.title.romaji || media.title.native || "Untitled",
      format: (media.format || "TV").replace(/_/g, " "),
      relationType,
      relationLabel: formatRelationLabel(relationType, isCurrent),
      track,
      orderIndex: track === "main" ? mainStoryline.length + 1 : sideStoriesAndMovies.length + 1,
      year: typeof year === "number" && year > 1900 ? year : null,
      episodes: media.episodes ?? null,
      poster: media.coverImage?.large ?? media.coverImage?.extraLarge ?? null,
      isCurrent,
      watchStatus,
      lastWatchedEpisode: snap?.lastEpisode ?? null,
      progressPercent: Math.max(0, Math.min(100, Math.round(snap?.progressPercent ?? 0))),
    };

    if (track === "main") {
      mainStoryline.push(node);
    } else {
      sideStoriesAndMovies.push(node);
    }
  }

  // If the current entry is a movie and mainStoryline ended up empty while sideStories has multiple movies,
  // promote them to mainStoryline so the user sees a primary numbered timeline.
  if (mainStoryline.length === 0 && sideStoriesAndMovies.length > 0) {
    const promoted = sideStoriesAndMovies.map((item, idx) => ({
      ...item,
      track: "main" as const,
      orderIndex: idx + 1,
    }));
    return {
      mainStoryline: promoted,
      sideStoriesAndMovies: [],
      totalEntries: promoted.length,
      completedEntries,
    };
  }

  return {
    mainStoryline,
    sideStoriesAndMovies,
    totalEntries: mainStoryline.length + sideStoriesAndMovies.length,
    completedEntries,
  };
}

