export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background text-on-surface pb-16" aria-busy="true" aria-label="Loading home feed">
      <div className="h-[52px] sm:h-16 w-full border-b border-border-custom bg-background/90" />
      <div className="w-full h-[54vh] min-h-[340px] max-h-[540px] bg-surface/60 animate-pulse border-b border-border-custom/40" />
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {[1, 2].map((row) => (
          <div key={row} className="space-y-3">
            <div className="h-6 w-44 rounded-lg bg-surface animate-pulse" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="w-[150px] sm:w-[190px] shrink-0 space-y-2">
                  <div className="aspect-[2/3] rounded-xl bg-surface border border-border-custom animate-pulse" />
                  <div className="h-3.5 w-4/5 rounded bg-surface animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
