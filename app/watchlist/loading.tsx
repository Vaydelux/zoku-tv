export default function WatchlistLoading() {
  return (
    <div className="min-h-screen bg-background text-on-surface pb-16" aria-busy="true" aria-label="Loading library">
      <div className="h-[52px] sm:h-16 w-full border-b border-border-custom bg-background/90" />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="h-9 w-48 rounded-xl bg-surface animate-pulse" />
          <div className="h-10 w-72 rounded-xl bg-surface animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] rounded-xl bg-surface border border-border-custom animate-pulse" />
              <div className="h-3.5 w-4/5 rounded bg-surface animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
