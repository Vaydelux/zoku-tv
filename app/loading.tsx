export default function RootLoading() {
  return (
    <div
      className="min-h-screen bg-background text-on-surface flex flex-col"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="h-[52px] sm:h-16 w-full border-b border-border-custom bg-background/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="h-7 w-28 rounded-lg bg-surface animate-pulse" />
        <div className="hidden lg:flex items-center gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-4 w-16 rounded bg-surface animate-pulse" />
          ))}
        </div>
        <div className="h-8 w-24 rounded-full bg-surface animate-pulse" />
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-8 w-56 rounded-xl bg-surface animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] w-full rounded-xl bg-surface border border-border-custom animate-pulse" />
              <div className="h-3.5 w-3/4 rounded bg-surface animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-surface/70 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
