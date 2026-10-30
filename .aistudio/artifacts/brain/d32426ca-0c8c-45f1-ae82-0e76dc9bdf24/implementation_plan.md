## Unified 16:9 Media Cards & Standardized Rail System

Zoku TV will unify every media card and horizontal/grid rail into a single, cohesive **16:9 landscape visual language** with a **minimal resting state**, **full interactive metadata and quick actions on hover/focus**, and a **standardized rail header** with leading icons, tabular item counts, optional right-hand controls, and smooth scroll progress indicators.

---

### Core Features

- **Unified 16:9 Landscape Card Architecture**:
  - Standardize `TitleCard`, `AnimeCard`, `ContinueWatchingCard`, and `WatchHistoryCard` to an `aspect-video` (16:9) widescreen format (`w-[240px] sm:w-[276px] md:w-[308px] lg:w-[328px]` in horizontal rails, and fluid `w-full` inside responsive page grids).
  - Resolve widescreen artwork automatically using high-resolution backdrops/banners (`backdrop_path` / `bannerImage`) with graceful fallback to cover/poster artwork so every card renders crisp 16:9 imagery.
  - Eliminate external floating media-type pills on the Search page that previously collided with card corners; integrate clean, unboxed `·`-separated metadata directly inside the card's typography hierarchy.

- **Minimal Resting State & Rich Hover/Focus Overlay**:
  - **Resting State**: Clean 16:9 widescreen image with a subtle bottom gradient scrim displaying only the essential inline metadata (`Year · Media Type` or `Episode · Status`) and a crisp single-line/two-line title, plus the bottom 1px–4px playback progress bar for Continue Watching and Watch History items.
  - **Hover & TV D-Pad Focus State**: Smoothly transitions to a full dark glassmorphic scrim revealing the top-left star rating, top-right unified circular/rounded action icon buttons (Watchlist toggle, Mark Watched / Completed toggle, Watch Again, Quick Remove), a concise 2-line synopsis or relative watched timestamp, and the primary bottom CTA (`Details & Watch`, `Resume`, or `Watch Again` + `Details`).

- **Standardized Rail Header & Track Chrome**:
  - Unify `TitleRail`, `AnimeRail`, `ContinueWatchingRail`, and `WatchHistoryRail` around a single header contract:
    - **Left**: Primary accent border (`border-l-2 border-primary`), contextual Lucide icon (`Film`, `Tv`, `Sparkles`, `PlayCircle`, `History`, or genre icon), rail title, and a tabular monospace item counter (`12 Titles`, `8 Series`, `4 Queued`, `6 Archived`).
    - **Right**: Contextual rail actions (such as `WatchHistoryRail` media-type/status filter tabs, `Clear Cache`, `Clear History`, or `ContinueWatchingRail`'s `Clear Queue`) paired with the unified horizontal scroll progress bar.
  - Standardize track spacing (`py-2.5 sm:py-3.5`, `gap-3.5 sm:gap-4`), edge fade gradients, and `RailNavButton` left/right chevrons across all horizontal rails.

- **Responsive 16:9 Grid Alignment Across Pages**:
  - Update grid containers and loading skeletons on **Discover** (TMDB & Anime), **Watchlist**, **Search**, and **Genre** pages from narrow 2:3 portrait columns to responsive 16:9 landscape grids (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5`) where cards fluidly fill their grid cells (`w-full`).

---

### Visual Direction

- **Domain Exemplars**: **Apple TV+** and **MUBI** — widescreen 16:9 editorial thumbnails where artwork breathes in the resting state and rich typographic context + tactile controls appear on hover or D-Pad focus.
- **Color & Atmospheric Polarity**: High-craft dark-first cinema surfaces (`bg-surface`, `border-border-custom`) with multi-stop bottom-to-top linear gradients (`from-black/95 via-black/60 to-black/20`) that guarantee WCAG AA text legibility over any backdrop image.
- **Typography & Scannable Hierarchy**:
  - **Rail Headers**: `font-display text-xs sm:text-sm font-semibold uppercase tracking-wide` paired with `font-mono text-[10px] tabular-nums` item counts.
  - **Card Metadata**: Unboxed `font-mono text-[10px] uppercase tracking-wider text-white/70` separated by `·` bullets (zero-pill discipline for static labels).
  - **Card Titles**: `font-display text-sm font-bold leading-snug text-white line-clamp-1`.
- **Layout, Spatial Architecture & Focal Point Design**:
  - Concentric border radii: outer card container uses `rounded-xl` (`12px`), while inner top-right action buttons and bottom CTAs use `rounded-lg` (`8px`).
  - Uniform hover elevation (`hover:-translate-y-1 hover:scale-[1.02] hover:border-primary`) with smooth 300ms easing and full keyboard / TV spatial navigation (`data-tv-focusable="true"`).

---

### Architecture & Design

```
+-----------------------------------------------------------------------------------+
| UNIFIED RAIL HEADER                                                               |
| [|] [Icon] RAIL TITLE   12 TITLES           [Optional Filters / Actions] [===---] |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +-----------------------------------+   +-----------------------------------+    |
|  | 16:9 CARD (RESTING STATE)         |   | 16:9 CARD (HOVER / FOCUS STATE)   |    |
|  |                                   |   | [★ 8.4]            [✓] [+] / [🗑] |    |
|  |          (Clean Backdrop          |   |                                   |    |
|  |             Artwork)              |   | 2026 · MOVIE                      |    |
|  |                                   |   | Title Name                        |    |
|  | 2026 · MOVIE                      |   | Two-line synopsis or archive info |    |
|  | Title Name                        |   | [▶ Details & Watch / Watch Again] |    |
|  | [===================------------] |   | [===================------------] |    |
|  +-----------------------------------+   +-----------------------------------+    |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

```
                 +------------------------------------------+
                 |     Shared 16:9 Card Visual Contract     |
                 |  (aspect-video, w-full or rail width,    |
                 |   resting scrim -> hover action overlay) |
                 +--------------------+---------------------+
                                      |
        +------------------+----------+----------+------------------+
        |                  |                     |                  |
        v                  v                     v                  v
+---------------+  +---------------+  +--------------------+  +------------------+
|   TitleCard   |  |   AnimeCard   |  | ContinueWatching   |  | WatchHistoryCard |
| (TMDB Movies  |  | (AniList      |  | Card               |  | (Completed/Part  |
|  & TV Series) |  |  Catalog)     |  | (Progress + Resume)|  |  + Watch Again)  |
+---------------+  +---------------+  +--------------------+  +------------------+
        |                  |                     |                  |
        +--------+---------+                     +--------+---------+
                 |                                        |
                 v                                        v
     +-----------------------+                +-----------------------+
     | Horizontal Rails &    |                | Home Playback Rails   |
     | Responsive 16:9 Grids |                | (Continue Watching &  |
     | (Home, Discover,      |                |  Watch History with   |
     |  Watchlist, Search)   |                |  Unified Rail Header) |
     +-----------------------+                +-----------------------+
```
