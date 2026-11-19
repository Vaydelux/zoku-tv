export default function DiscoverLoading() {
  return (
    <div className="min-h-screen bg-background text-on-surface pb-16" aria-busy="true" aria-label="Loading catalog">
      <div className="h-[52px] sm:h-16 w-full border-b border-border-custom bg-background/90" />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="h-9 w-52 rounded-xl bg-surface animate-pulse" />
          <div className="h-10 w-64 rounded-xl bg-surface animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] rounded-xl bg-surface border border-border-custom animate-pulse" />
              <div className="h-3.5 w-3/4 rounded bg-surface animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
