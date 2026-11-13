const COMPANIES = [149142] as const;
const MAX_PAGES = 500;
const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

export interface RestrictedMovieCatalog {
  ids: number[];
  refreshedAt: number;
}

let cached: RestrictedMovieCatalog | null = null;
let inFlight: Promise<RestrictedMovieCatalog> | null = null;

export function tmdbReadAccessToken(): string {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN?.trim();
  if (!token || !token.startsWith("eyJ") || token.split(".").length !== 3) {
    throw new Error("Server-only TMDB_API_READ_ACCESS_TOKEN is not configured");
  }
  return token;
}

async function loadCompanyPage(token: string, company: number, page: number) {
  const url = new URL("https://api.themoviedb.org/3/discover/movie");
  url.searchParams.set("with_companies", String(company));
  url.searchParams.set("include_adult", "true");
  url.searchParams.set("page", String(page));
  const result = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!result.ok) throw new Error(`Company lookup unavailable: ${result.status}`);
  const data: unknown = await result.json();
  if (!data || typeof data !== "object" || !("results" in data) || !Array.isArray(data.results) ||
      !("total_pages" in data) || typeof data.total_pages !== "number" || !Number.isSafeInteger(data.total_pages)) {
    throw new Error("Invalid company lookup response");
  }
  const payload = data as { total_pages: number; results: { id: number }[] };
  if (payload.results.some((movie) => !movie || !Number.isSafeInteger(movie.id) || movie.id <= 0)) {
    throw new Error("Malformed company movie ID");
  }
  return payload;
}

export async function restrictedMovieCatalog(): Promise<RestrictedMovieCatalog> {
  if (cached && Date.now() - cached.refreshedAt < CACHE_TTL_MS) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const token = tmdbReadAccessToken();
    const ids = new Set<number>();
    for (const company of COMPANIES) {
      const first = await loadCompanyPage(token, company, 1);
      const total = first.total_pages;
      if (total < 1 || total > MAX_PAGES) throw new Error("Company catalog pagination truncated");
      for (const movie of first.results) ids.add(movie.id);
      // A bounded fan-out avoids a serial cold start while respecting TMDB.
      for (let page = 2; page <= total; page += 4) {
        const batch = Array.from({ length: Math.min(4, total - page + 1) }, (_, i) => page + i);
        const payloads = await Promise.all(batch.map((p) => loadCompanyPage(token, company, p)));
        for (const payload of payloads) {
          if (payload.total_pages !== total) throw new Error("Company catalog changed during pagination");
          for (const movie of payload.results) ids.add(movie.id);
        }
      }
    }
    cached = { ids: [...ids], refreshedAt: Date.now() };
    return cached;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
