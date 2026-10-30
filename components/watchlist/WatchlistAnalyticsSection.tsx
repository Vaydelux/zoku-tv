"use client";

import { useState, useMemo } from "react";
import * as d3 from "d3";
import {
  PieChart as PieChartIcon,
  BarChart3,
  Film,
  Tv,
  Sparkles,
  Star,
  ChevronDown,
  Layers,
  Info,
} from "lucide-react";
import {
  computeWatchlistAnalytics,
  type WatchlistSortableItem,
  type MediaTypeDistribution,
  type GenreComposition,
} from "@/lib/watchlist";

interface WatchlistAnalyticsSectionProps {
  items: WatchlistSortableItem[];
  catalogFilteredItems?: WatchlistSortableItem[];
  catalogMode?: "tmdb" | "anime";
}

export function WatchlistAnalyticsSection({
  items,
  catalogFilteredItems,
  catalogMode = "tmdb",
}: WatchlistAnalyticsSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [scope, setScope] = useState<"all" | "catalog">("all");
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);

  // Determine items to analyze based on scope
  const targetItems = useMemo(() => {
    if (scope === "catalog" && catalogFilteredItems && catalogFilteredItems.length > 0) {
      return catalogFilteredItems;
    }
    return items;
  }, [scope, catalogFilteredItems, items]);

  const analytics = useMemo(() => computeWatchlistAnalytics(targetItems), [targetItems]);

  // Donut chart dimensions
  const donutSize = 220;
  const radius = donutSize / 2;
  const innerRadius = radius * 0.62;
  const outerRadius = radius * 0.92;
  const hoverOuterRadius = radius * 0.98;

  // Compute D3 pie slices for media types
  const pieData = useMemo(() => {
    const activeMedia = analytics.mediaTypeDistribution.filter((d) => d.count > 0);
    const pieGenerator = d3
      .pie<MediaTypeDistribution>()
      .value((d) => d.count)
      .sort(null)
      .padAngle(activeMedia.length > 1 ? 0.04 : 0);

    return pieGenerator(activeMedia);
  }, [analytics.mediaTypeDistribution]);

  // Arc generators
  const standardArc = useMemo(
    () =>
      d3
        .arc<d3.PieArcDatum<MediaTypeDistribution>>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .cornerRadius(4),
    [innerRadius, outerRadius]
  );

  const hoveredArc = useMemo(
    () =>
      d3
        .arc<d3.PieArcDatum<MediaTypeDistribution>>()
        .innerRadius(innerRadius)
        .outerRadius(hoverOuterRadius)
        .cornerRadius(6),
    [innerRadius, hoverOuterRadius]
  );

  // Top genres for bar chart
  const topGenres = useMemo(
    () => analytics.genreComposition.slice(0, 8),
    [analytics.genreComposition]
  );

  const maxGenreCount = useMemo(
    () => (topGenres.length > 0 ? d3.max(topGenres, (g) => g.count) || 1 : 1),
    [topGenres]
  );

  // D3 scale for genre bar chart width
  const genreWidthScale = useMemo(
    () => d3.scaleLinear().domain([0, maxGenreCount]).range([0, 100]),
    [maxGenreCount]
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="watchlist-analytics-section"
      className="glass-panel rounded-2xl border border-border-custom overflow-hidden transition-all duration-300"
    >
      {/* Header bar with toggle */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom/80 bg-surface/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-sm shrink-0">
            <PieChartIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-display font-bold text-on-surface uppercase tracking-wider">
                Watchlist Analytics
              </h2>
              <span className="rounded-full bg-primary/20 border border-primary/30 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                D3 Visuals
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Distribution of media types & genre composition across {analytics.totalItems} saved {analytics.totalItems === 1 ? "item" : "items"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {catalogFilteredItems && catalogFilteredItems.length !== items.length && (
            <div className="inline-flex rounded-xl p-0.5 border border-border-custom bg-surface text-xs font-semibold">
              <button
                type="button"
                onClick={() => setScope("all")}
                data-testid="analytics-scope-all"
                className={`px-2.5 py-1 rounded-lg transition-all text-[11px] ${
                  scope === "all"
                    ? "bg-primary text-primary-contrast shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                All Formats
              </button>
              <button
                type="button"
                onClick={() => setScope("catalog")}
                data-testid="analytics-scope-catalog"
                className={`px-2.5 py-1 rounded-lg transition-all text-[11px] ${
                  scope === "catalog"
                    ? "bg-primary text-primary-contrast shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {catalogMode === "anime" ? "Anime Only" : "Movies & TV"}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            data-testid="toggle-analytics-btn"
            aria-expanded={isOpen}
            className="theme-panel inline-flex items-center gap-1.5 rounded-xl border border-border-custom px-3 py-1.5 text-xs font-semibold text-on-surface hover:text-primary transition-all duration-200"
          >
            <span>{isOpen ? "Hide Insights" : "Show Insights"}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="theme-panel rounded-xl border border-border-custom p-3.5 space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-[11px] font-mono uppercase tracking-wider">Total Saved</span>
                <Layers className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xl sm:text-2xl font-display font-bold text-on-surface">
                {analytics.totalItems}
              </p>
              <p className="text-[10px] text-on-surface-variant/80 font-mono">
                {analytics.movieCount} Movies · {analytics.tvCount} TV · {analytics.animeCount} Anime
              </p>
            </div>

            <div className="theme-panel rounded-xl border border-border-custom p-3.5 space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-[11px] font-mono uppercase tracking-wider">Top Genre</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <p className="text-xl sm:text-2xl font-display font-bold text-primary truncate" title={analytics.topGenre || "N/A"}>
                {analytics.topGenre || "N/A"}
              </p>
              <p className="text-[10px] text-on-surface-variant/80 font-mono">
                {topGenres[0] ? `${topGenres[0].count} titles (${topGenres[0].percentage}%)` : "No genres"}
              </p>
            </div>

            <div className="theme-panel rounded-xl border border-border-custom p-3.5 space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-[11px] font-mono uppercase tracking-wider">Avg Rating</span>
                <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
              </div>
              <p className="text-xl sm:text-2xl font-display font-bold text-on-surface">
                {analytics.averageRating ? `${analytics.averageRating}` : "N/A"}
                {analytics.averageRating && <span className="text-xs text-on-surface-variant font-mono font-normal"> / 10</span>}
              </p>
              <p className="text-[10px] text-on-surface-variant/80 font-mono">
                Community score
              </p>
            </div>

            <div className="theme-panel rounded-xl border border-border-custom p-3.5 space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-[11px] font-mono uppercase tracking-wider">Unique Genres</span>
                <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-xl sm:text-2xl font-display font-bold text-on-surface">
                {analytics.genreComposition.length}
              </p>
              <p className="text-[10px] text-on-surface-variant/80 font-mono">
                Diverse tastes
              </p>
            </div>
          </div>

          {/* Visualizations Grid: Media Types (Movies vs TV vs Anime) + Genre Composition */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 1. Media Type Distribution (Donut Chart) */}
            <div
              data-testid="media-type-distribution-card"
              className="lg:col-span-5 theme-panel rounded-xl border border-border-custom p-4 sm:p-5 flex flex-col justify-between"
            >
              <div className="space-y-1 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
                    <PieChartIcon className="h-3.5 w-3.5 text-primary" />
                    <span>Media Type Distribution</span>
                  </h3>
                  <span className="text-[10px] font-mono text-on-surface-variant">
                    Movies vs TV vs Anime
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Proportion of format categories in your saved library
                </p>
              </div>

              {/* D3 Donut Visual */}
              <div className="relative flex items-center justify-center py-2">
                <svg
                  width={donutSize}
                  height={donutSize}
                  viewBox={`0 0 ${donutSize} ${donutSize}`}
                  className="overflow-visible select-none"
                  role="img"
                  aria-label="D3 Donut Chart showing media type distribution"
                >
                  <g transform={`translate(${radius}, ${radius})`}>
                    {pieData.map((slice) => {
                      const isHovered = hoveredSlice === slice.data.type;
                      const path = (isHovered ? hoveredArc(slice) : standardArc(slice)) || "";
                      return (
                        <path
                          key={slice.data.type}
                          d={path}
                          fill={slice.data.color}
                          data-testid={`donut-slice-${slice.data.type}`}
                          className="cursor-pointer transition-all duration-200"
                          style={{
                            opacity: hoveredSlice && !isHovered ? 0.45 : 1,
                            filter: isHovered ? "drop-shadow(0 4px 10px rgba(0,0,0,0.5))" : undefined,
                          }}
                          onMouseEnter={() => setHoveredSlice(slice.data.type)}
                          onMouseLeave={() => setHoveredSlice(null)}
                        />
                      );
                    })}

                    {/* Center text in donut hole */}
                    <text
                      textAnchor="middle"
                      dy="-0.3em"
                      className="fill-on-surface font-display font-bold text-2xl select-none"
                    >
                      {hoveredSlice
                        ? analytics.mediaTypeDistribution.find((d) => d.type === hoveredSlice)?.count
                        : analytics.totalItems}
                    </text>
                    <text
                      textAnchor="middle"
                      dy="1.3em"
                      className="fill-on-surface-variant font-mono text-[10px] uppercase tracking-wider select-none"
                    >
                      {hoveredSlice
                        ? analytics.mediaTypeDistribution.find((d) => d.type === hoveredSlice)?.label
                        : "Total Titles"}
                    </text>
                  </g>
                </svg>
              </div>

              {/* Donut Legend */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border-custom/60">
                {analytics.mediaTypeDistribution.map((item) => {
                  const isHovered = hoveredSlice === item.type;
                  return (
                    <div
                      key={item.type}
                      data-testid={`media-legend-${item.type}`}
                      onMouseEnter={() => setHoveredSlice(item.type)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      className={`flex flex-col p-2 rounded-lg cursor-pointer transition-all ${
                        isHovered
                          ? "bg-surface-hover ring-1 ring-primary/40"
                          : "hover:bg-surface-hover/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[11px] font-semibold text-on-surface truncate">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xs font-mono font-bold text-on-surface">
                          {item.count}
                        </span>
                        <span className="text-[10px] font-mono text-on-surface-variant">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Genre Composition (Horizontal Bar Chart) */}
            <div
              data-testid="genre-composition-card"
              className="lg:col-span-7 theme-panel rounded-xl border border-border-custom p-4 sm:p-5 flex flex-col justify-between"
            >
              <div className="space-y-1 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Genre Composition</span>
                  </h3>
                  <span className="text-[10px] font-mono text-on-surface-variant">
                    Top {topGenres.length} Genres
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Frequency and share of thematic genres across your watchlist
                </p>
              </div>

              {/* D3-scaled Genre Bars */}
              {topGenres.length > 0 ? (
                <div className="space-y-2.5 my-auto">
                  {topGenres.map((genreItem, idx) => {
                    const widthPercent = genreWidthScale(genreItem.count);
                    const isHovered = hoveredGenre === genreItem.genre;
                    return (
                      <div
                        key={genreItem.genre}
                        data-testid={`genre-bar-${genreItem.genre.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                        onMouseEnter={() => setHoveredGenre(genreItem.genre)}
                        onMouseLeave={() => setHoveredGenre(null)}
                        className={`group rounded-lg p-1.5 transition-all cursor-pointer ${
                          isHovered ? "bg-surface-hover/80" : "hover:bg-surface-hover/40"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[10px] text-on-surface-variant w-4 text-right">
                              {idx + 1}.
                            </span>
                            <span className="font-semibold text-on-surface truncate">
                              {genreItem.genre}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                            <span className="font-bold text-on-surface">
                              {genreItem.count} {genreItem.count === 1 ? "title" : "titles"}
                            </span>
                            <span className="text-on-surface-variant text-[10px]">
                              ({genreItem.percentage}%)
                            </span>
                          </div>
                        </div>

                        {/* Bar Track & Fill */}
                        <div className="h-2.5 w-full bg-surface rounded-full overflow-hidden border border-border-custom/50">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${Math.max(widthPercent, 3)}%`,
                              backgroundColor: genreItem.color,
                              filter: isHovered
                                ? "brightness(1.2) drop-shadow(0 0 6px rgba(99, 102, 241, 0.5))"
                                : undefined,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-on-surface-variant font-mono">
                  No genre metadata available
                </div>
              )}

              {/* Informative footer */}
              <div className="pt-3 border-t border-border-custom/60 flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <Info className="h-3 w-3 text-primary" />
                  <span>Ranked by frequency across saved titles</span>
                </span>
                <span>
                  Showing {topGenres.length} of {analytics.genreComposition.length} genres
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
