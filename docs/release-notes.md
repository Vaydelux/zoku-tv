# Zoku TV — Release Notes (v1.1.0 Production Hardening Release)

## Highlights

### 1. Watchlist Live Search & Interactive D3 Analytics
- **Live Search Bar**: Filter saved Watchlist items in real time by **title** or **creator / director / studio name** ([`app/watchlist/page.tsx`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/app/watchlist/page.tsx)).
- **Interactive D3.js Analytics**: Added [`components/watchlist/WatchlistAnalyticsSection.tsx`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/components/watchlist/WatchlistAnalyticsSection.tsx) featuring an interactive SVG Donut Chart for media type distribution (Movies vs. TV Shows vs. Anime) and a horizontal SVG Bar Chart for top genre composition, complete with hover tooltips, summary KPI cards, and accessible screen-reader tables.

### 2. Redesigned Premium External Player Container (Phase 8)
- **Clean 16:9 Cinema Layout**: Redesigned [`app/watch/[type]/[id]/page.tsx`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/app/watch/%5Btype%5D/%5Bid%5D/page.tsx), [`app/watch/[type]/[id]/[season]/[episode]/page.tsx`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/app/watch/%5Btype%5D/%5Bid%5D/%5Bseason%5D/%5Bepisode%5D/page.tsx), and [`app/watch/anime/[anilistId]/[season]/[episode]/page.tsx`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/app/watch/anime/%5BanilistId%5D/%5Bseason%5D/%5Bepisode%5D/page.tsx) with a focused **`Now Watching`** header, 16:9 framed container, compact control bar (`Server ∨`, `↻ Retry`, `Next Server`, `Watched · Next`, `Previous`, `Next >`), and a 3-column **`Episodes`** thumbnail grid with season switcher.
- **Honest Container Readiness vs. Playback Sync**: Distinguishes between `Loading Frame...`, `Container Ready` (iframe document loaded), and `Playback Synced` (confirmed runtime `postMessage` progress received).
- **Zero Embed Regression**: All third-party provider URLs, query parameters, and iframe attributes in [`lib/embed.ts`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/lib/embed.ts) and [`lib/anime-embed.ts`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/lib/anime-embed.ts) are preserved untouched.

### 3. Real Kids Mode Content Classification & Restriction Gates
- Replaced the legacy `vote_average < 7.5` heuristic with [`lib/kids-mode.ts`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/lib/kids-mode.ts), enforcing conservative maturity classification across Homepage, Discover, Genre, Search, Autocomplete, Title/Anime Details, and Watch routes.
- Direct URL navigation to mature movies, TV shows, or anime while in Kids Mode is blocked with a clear **Restricted in Kids Mode** gate.

### 4. Security, Privacy, & Data Isolation Hardening
- **Salted SHA-256 Local Credential Hashing**: Replaced plaintext password storage in local fallback mode with salted SHA-256 digests (`hashLocalCredential` in [`lib/firebase.ts`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/lib/firebase.ts)).
- **Complete Profile Deletion Cleanup**: Deleting a profile now purges all subcollections (`watchlist`, `continueWatching`, `watchHistory`, `episodeProgress`, `searchHistory`) and profile-scoped `localStorage` keys (`purgeProfileData`).
- **Firestore Security Rules**: Hardened [`firestore.rules`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/firestore.rules) with strict path ownership and schema validators.

### 5. Cross-Device, TV Browser, & PWA Hardening
- Added 10-foot TV focus styling, `prefers-reduced-motion` support, and spatial/grid directional navigation helpers ([`lib/tv-navigation.ts`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/lib/tv-navigation.ts)).
- Hardened [`public/sw.js`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/public/sw.js) so only public image CDNs (`image.tmdb.org`, `s4.anilist.co`) and same-origin app shell routes are cached, never caching Firebase Auth/Firestore or cross-origin embed streams.

