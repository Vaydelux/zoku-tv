export type UnifiedCatalogType = "movie" | "tv" | "anime";

export function normalizeCatalogType(
  raw: string | null | undefined,
  fallback: UnifiedCatalogType = "movie"
): UnifiedCatalogType {
  if (raw === "movie" || raw === "tv" || raw === "anime") return raw;
  return fallback;
}

export function buildGenresUrl(type: UnifiedCatalogType): string {
  return `/genres?type=${encodeURIComponent(type)}`;
}

export function buildDiscoverUrl(options: {
  type: UnifiedCatalogType;
  genre?: string | number | null;
  sortBy?: string | null;
  view?: "catalog" | "schedule";
}): string {
  const params = new URLSearchParams();
  params.set("type", options.type);

  if (options.type === "anime") {
    if (options.view === "schedule") {
      params.set("view", "schedule");
    } else if (options.genre !== undefined && options.genre !== null && String(options.genre).trim()) {
      params.set("genres", String(options.genre).trim());
    }
    if (options.sortBy) params.set("sort", options.sortBy);
  } else {
    if (options.genre !== undefined && options.genre !== null && String(options.genre).trim()) {
      params.set("with_genres", String(options.genre).trim());
    }
    if (options.sortBy) params.set("sort_by", options.sortBy);
  }

  return `/discover?${params.toString()}`;
}
