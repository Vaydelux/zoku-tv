import Link from "next/link";
import { Bookmark, Compass, Film, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-border-custom bg-surface p-6 sm:p-8 text-center space-y-5 shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Film className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="font-mono text-xs font-semibold tracking-wider text-primary tabular-nums">
            404
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-on-surface text-balance">
            This title or route could not be found
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            The link may have moved or been removed from the catalog. Jump back in from any destination below.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <Link
            href="/home"
            data-tv-focusable="true"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-contrast hover:opacity-90 transition-opacity"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
          <Link
            href="/search"
            data-tv-focusable="true"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border-custom bg-background px-4 py-2.5 text-sm font-semibold text-on-surface hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </Link>
          <Link
            href="/genres"
            data-tv-focusable="true"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border-custom bg-background px-4 py-2.5 text-sm font-semibold text-on-surface hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            Genres
          </Link>
          <Link
            href="/watchlist"
            data-tv-focusable="true"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border-custom bg-background px-4 py-2.5 text-sm font-semibold text-on-surface hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            Watchlist
          </Link>
        </div>
      </div>
    </div>
  );
}
