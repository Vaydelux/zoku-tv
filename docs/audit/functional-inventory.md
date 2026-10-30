# Zoku TV — Baseline Functional Inventory & Checklist

## 1. Functional Area Inventory

| Area | Route / Module | Current Status | Notes & Required Hardening |
| :--- | :--- | :--- | :--- |
| **Landing & Auth Gate** | `/`, `components/AuthGate.tsx` | Working | Redirects unauthenticated users to `/login`, authenticated users without active profile to `/profiles`, and active sessions to `/home`. |
| **Login & Signup** | `/login`, `/signup`, `lib/firebase.ts` | Needs Hardening | Email/password and Google OAuth supported. Local fallback mode stores plaintext passwords (`lib/firebase.ts:309`) and lacks explicit local/demo mode banner on auth forms. |
| **Profile Selection & CRUD** | `/profiles`, `stores/index.ts` | Needs Hardening | Supports up to 4 profiles, custom SVG avatars, 10 color themes, and Kids Mode toggle. Profile deletion uses native `confirm()` instead of accessible dialog and leaves orphaned subcollections/localStorage keys. |
| **Homepage (TMDB & Anime)** | `/home`, `app/home/page.tsx` | Needs Hardening | Displays Hero carousel, Continue Watching, Watch History, Watchlist preview, Trending, and custom Genre rails. Contains a cluttered 18-theme selector strip directly in the main browsing flow (`app/home/page.tsx:249-310`) and lacks Kids Mode filtering. |
| **Global Navigation** | `components/Navbar.tsx` | Working | Sticky header with catalog badge, desktop & mobile navigation, live connectivity badge, voice search button, autocomplete input, and profile switcher. |
| **Discovery & Filtering** | `/discover`, `app/discover/page.tsx`, `app/discover/AnimeDiscover.tsx` | Needs Hardening | Supports sorting, genre selection, year/era, runtime, language, and rating filters. Kids Mode uses broken `vote_average < 7.5` check in TMDB and is missing in AnimeDiscover. |
| **Search, Autocomplete & Voice** | `/search`, `components/SearchAutocompleteDropdown.tsx`, `components/VoiceSearchButton.tsx` | Needs Hardening | Real-time debounced suggestions, profile-scoped search history, and Web Speech API voice search with sample prompt fallback. Needs proper Kids Mode filtering and request cancellation. |
| **Media Details (TMDB & Anime)** | `/title/[type]/[id]`, `/anime/[id]` | Needs Hardening | Displays backdrop, poster, genres, cast, trailer modal, season/episode selector, episode progress bars, and recommendations. Needs accurate maturity/age badges and Kids Mode access gate. |
| **Watchlist, Search & D3 Analytics** | `/watchlist`, `components/watchlist/WatchlistAnalyticsSection.tsx` | Working & Verified | Supports live filtering by title or creator name, media-type filters, sort modes, and interactive D3 Donut + Horizontal Bar charts for media type and genre distribution. |
| **External Iframe Player Pages** | `/watch/[type]/[id]`, `/watch/[type]/[id]/[season]/[episode]`, `/watch/anime/[anilistId]/[season]/[episode]` | Needs Redesign & Fix | Uses immutable third-party iframe URLs (`lib/embed.ts`, `lib/anime-embed.ts`). Needs surrounding shell redesign matching reference UI, fix for first-time playback listener bug (`useWatchProgress.ts`), and honest container vs. playback status indicator. |
| **Settings & Diagnostics** | `/settings` | Needs Hardening | Supports 18 themes, light/dark toggle, iframe sandbox mode, catalog switcher, home genre rails, and cache clearing. Needs profile management shortcuts and confirmation dialogs. |
| **Service Worker & PWA** | `public/sw.js`, `public/manifest.json` | Needs Hardening | Registers service worker and caches static assets, but `public/sw.js` overly broadly caches all GET requests. Must restrict caching to same-origin static assets and public poster CDNs. |

---

## 2. Baseline Functional Verification Checklist

- [x] **Authentication Routing**: `lib/auth-routes.test.ts` verifies unauthenticated, authenticated-without-profile, and authenticated-with-profile redirect rules.
- [x] **Profile Limits & Avatars**: `lib/profile-limits.test.ts` and `lib/profile-avatars.test.ts` verify maximum 4 profiles and deterministic avatar/color resolution.
- [x] **Canonical Media IDs**: `lib/media-id.test.ts` verifies `movie_123`, `tv_456`, and `anime_789` normalization and legacy bare numeric ID migration.
- [x] **Watchlist Deduplication & Sorting**: `lib/watchlist.test.ts` verifies canonical deduplication, sorting, and live title/creator search filtering.
- [x] **Watchlist D3 Analytics**: `lib/watchlist-analytics.test.ts` verifies Movie/TV/Anime distribution percentages and genre frequency aggregation.
- [x] **Continue Watching & Episode Progress**: `lib/continue-watching.test.ts`, `lib/episode-progress.test.ts`, and `lib/player-progress.test.ts` verify 5%–90% resume window, completion thresholds (`>= 90%`), and `postMessage` event parsing.
- [x] **Watch History Merging**: `lib/watch-history.test.ts` verifies deduplication and most-recent-first ordering.
- [x] **Profile-Scoped Search History**: `lib/search-history.test.ts` verifies per-profile storage key isolation.
- [ ] **Kids Mode Content Classification**: Pending Phase 1 implementation (`lib/kids-mode.ts` + `lib/kids-mode.test.ts`).
- [ ] **Cross-Profile Deletion Cleanup & Hashed Local Passwords**: Pending Phase 1 implementation (`lib/security-isolation.test.ts`).
- [ ] **TV Browser / D-Pad Spatial Navigation**: Pending Phase 9 implementation (`lib/tv-navigation.ts` + `lib/tv-navigation.test.ts`).

