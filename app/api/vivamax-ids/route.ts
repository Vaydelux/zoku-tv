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
    for (const companyId of COMPANY_IDS) {
      let totalPages = 1;
      for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page++) {
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
        if (page === 1) totalPages = Math.min(Math.max(1, data.total_pages || 1), MAX_PAGES);
        for (const movie of data.results || []) {
          if (Number.isSafeInteger(movie.id) && (movie.id || 0) > 0) ids.add(movie.id!);
        }
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
