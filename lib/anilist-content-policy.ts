/**
 * Zoku TV adult-content restrictions for AniList.
 * Independent of Kids Mode (which remains more restrictive).
 * This policy targets explicit sexual content, not all horror or mature drama.
 */
export interface AniListSafetyMedia {
  id: number;
  isAdult?: boolean | null;
  genres?: string[] | null;
  tags?: { name?: string | null; isAdult?: boolean | null }[] | null;
  title?: { english?: string | null; romaji?: string | null; native?: string | null } | null;
}

const ADULT_GENRES = new Set(["hentai", "ecchi", "erotica"]);
const EXPLICIT_TAGS = new Set([
  "nudity", "sexual content", "sexual violence", "sexual assault",
  "rape", "incest", "prostitution", "sex work", "erotica",
  "pornography", "explicit sex", "sexual abuse", "underage sex",
]);

/**
 * Fail closed if AniList omits its age flag or taxonomy from an item.
 * MediaTag.isAdult is an AniList field identifying 18+ topic tags.
 */
export function isRestrictedAniListMedia(media: AniListSafetyMedia): boolean {
  if (!media || !Number.isSafeInteger(media.id) || media.id <= 0) return true;
  if (media.isAdult !== false) return true;
  if (!Array.isArray(media.genres) || !Array.isArray(media.tags)) return true;
  if (media.genres.some((genre) => ADULT_GENRES.has(genre.toLowerCase().trim()))) return true;
  if (media.tags.some((tag) =>
    tag?.isAdult === true || EXPLICIT_TAGS.has((tag?.name || "").toLowerCase().trim())
  )) return true;
  const title = [media.title?.romaji, media.title?.english, media.title?.native].filter(Boolean).join(" ");
  return /\b(?:hentai|uncensored erotica|pornographic anime)\b/i.test(title);
}

export function filterAniListMedia<T extends AniListSafetyMedia>(items: T[], enabled: boolean): T[] {
  return enabled ? items.filter((item) => !isRestrictedAniListMedia(item)) : items;
}

export function sanitizeAniListDetail<T extends AniListSafetyMedia & {
  relations?: { edges?: { relationType?: string; node?: AniListSafetyMedia | null }[] | null } | null;
  recommendations?: { nodes?: { mediaRecommendation?: AniListSafetyMedia | null }[] | null } | null;
}>(data: T, enabled: boolean): T {
  if (!enabled) return data;
  return {
    ...data,
    relations: data.relations ? {
      ...data.relations,
      edges: (data.relations.edges || []).filter((entry) =>
        entry.node && !isRestrictedAniListMedia(entry.node)
      ),
    } : data.relations,
    recommendations: data.recommendations ? {
      ...data.recommendations,
      nodes: (data.recommendations.nodes || []).filter((entry) =>
        entry.mediaRecommendation && !isRestrictedAniListMedia(entry.mediaRecommendation)
      ),
    } : data.recommendations,
  };
}
