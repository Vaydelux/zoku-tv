import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPANY_IDS = [149142];
const MAX_PAGES = 500;
const TTL_MS = 24 * 60 * 60 * 1000;
let snapshot: { ids: number[]; refreshedAt: number } | null = null;
let ongoing: Promise<{ ids: number[]; refreshedAt: number }> | null = null;

async function loadCompanyIds(): Promise<{ ids: number[]; refreshedAt: number }> {
  if (snapshot && Date.now() - snapshot.refreshedAt < TTL_MS) return snapshot;
  if (ongoing) return ongoing;
  ongoing = (async () => {
    const token = process.env.TMDB_API_READ_ACCESS_TOKEN || process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN;
    if (!token) throw new Error("TMDB token is not configured");
    const ids = new Set<number>();
    async function fetchCompanyPage(companyId: number, page: number) {
      const url = new URL("https://api.themoviedb.org/3/discover/movie");
      url.searchParams.set("with_companies", String(companyId));
      url.searchParams.set("include_adult", "true");
      url.searchParams.set("page", String(page));
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`TMDB company lookup failed: ${response.status}`);
      const data = await response.json() as { total_pages?: number; results?: { id?: number }[] };
      if (!Array.isArray(data.results)) throw new Error("Invalid TMDB company lookup response");
      for (const movie of data.results) {
        if (Number.isSafeInteger(movie.id) && (movie.id || 0) > 0) ids.add(movie.id!);
      }
      return data;
    }

    for (const companyId of COMPANY_IDS) {
      const first = await fetchCompanyPage(companyId, 1);
      const totalPages = first.total_pages;
      if (!Number.isSafeInteger(totalPages) || !totalPages || totalPages < 1 || totalPages > MAX_PAGES) {
        throw new Error("Company catalog cannot be verified completely");
      }
      // Bounded parallelism reduces cold-start latency without flooding TMDB.
      const batchSize = 4;
      for (let page = 2; page <= totalPages; page += batchSize) {
        const pages = Array.from({ length: Math.min(batchSize, totalPages - page + 1) }, (_, i) => page + i);
        await Promise.all(pages.map((number) => fetchCompanyPage(companyId, number)));
      }
    }
    snapshot = { ids: [...ids], refreshedAt: Date.now() };
    return snapshot;
  })();
  try { return await ongoing; } finally { ongoing = null; }
}

export async function GET() {
  try {
    const { ids, refreshedAt } = await loadCompanyIds();
    return NextResponse.json({ ids, refreshedAt, complete: true }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    if (snapshot) {
      return NextResponse.json({ ...snapshot, complete: false }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    return NextResponse.json({ ids: [], complete: false, error: "Company catalog unavailable" }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
