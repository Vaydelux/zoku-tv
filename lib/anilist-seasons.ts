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
