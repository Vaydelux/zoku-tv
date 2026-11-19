import { BrandMark } from "@/components/BrandMark";

/**
 * Clean, minimal root route loader — intentionally avoids movie/poster card
 * skeletons so auth routes (/login, /signup, /profiles) never flash homepage cards.
 * Catalog routes (/home, /discover, /watchlist) provide their own media skeletons.
 */
export default function RootLoading() {
  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-background px-4 text-on-surface"
      aria-busy="true"
      aria-label="Loading Zoku TV"
    >
      <BrandMark size="lg" pulse />
      <div
        className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
        aria-hidden="true"
      />
    </div>
  );
}
