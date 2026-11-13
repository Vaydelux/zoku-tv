import { NextResponse } from "next/server";
import { restrictedMovieCatalog } from "@/lib/server/tmdb-company-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await restrictedMovieCatalog();
    return NextResponse.json({ ...catalog, complete: true }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ ids: [], complete: false, error: "Company catalog unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
