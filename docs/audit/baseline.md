# Zoku TV — Phase 0 Baseline Audit Report

**Repository**: `https://github.com/Vaydelux/zoku-tv`  
**Audit Date**: 2026-10-30  
**Framework**: Next.js 15.0.5 (App Router) + React 19 + TypeScript 5.8 + Tailwind CSS v4 + Zustand 5.0 + Firebase 11.4 + D3 7.9  

---

## 1. Executive Summary

Zoku TV is a dual-catalog entertainment discovery and viewing web application supporting **TMDB (Movies & TV)** and **AniList (Anime)** catalogs, multi-profile households (up to 4 profiles per account), an 18-theme cinema palette system with light/dark appearance modes, real-time Firestore synchronization with an offline/local-storage fallback layer, and multi-server external iframe playback containers.

This baseline audit inspected all application routes, components, Zustand stores, hooks, metadata services, Firebase integration, Firestore security rules, PWA service worker logic, configuration files, and automated test suites.

---

## 2. Actual Check Results at Baseline

| Check | Command | Baseline Status | Observed Output / Findings |
| :--- | :--- | :--- | :--- |
| **Unit Tests** | `npm test` (`tsx --test "lib/**/*.test.ts"`) | **PASS (49/49)** | 14 test suites, 49 passing tests, 0 failures (`auth-routes`, `continue-watching`, `episode-progress`, `media-id`, `network-status`, `player-progress`, `profile-avatars`, `profile-limits`, `runtime-guards`, `search-history`, `watch-history`, `watchlist-analytics`, `watchlist`). |
| **ESLint** | `npm run lint` (`next lint`) | **FAIL (Config Issue)** | Next.js 15 `next lint` fails because `.eslintrc.json` is missing and triggers interactive setup in non-TTY mode. |
| **TypeScript** | `npx tsc --noEmit` | **FAIL (6 files)** | `TS7016: Could not find a declaration file for module 'motion/react'` in 5 rail/carousel components (`AnimeRail.tsx`, `ContinueWatchingRail.tsx`, `HeroCarousel.tsx`, `TitleRail.tsx`, `WatchHistoryRail.tsx`), and `TS2307` on `firebase/*` in `lib/firebase.ts` due to restrictive `"types": ["node"]` in `tsconfig.json`. |
| **Production Build** | `npm run build` (`next build`) | **FAIL (2 causes)** | 1. Webpack module resolution error inside `motion/react` (`Can't resolve '../render/dom/visual-element-target.mjs'`). Switching imports to `"framer-motion"` (already installed) resolves this. 2. `next/font/google` in `app/layout.tsx` attempts network fetch to `fonts.googleapis.com` when building in an offline sandbox. |

---

## 3. Verified Defects vs. Suspected Issues

### Verified Bugs (Confirmed in Source Code)

1. **[CRITICAL] Broken Kids Mode Filtering Across Application**
   - **Locations**: `app/discover/page.tsx:135`, `app/search/page.tsx:109`, `app/genre/[id]/page.tsx:56`, `app/title/[type]/[id]/page.tsx:65`.
   - **Defect**: Kids Mode filters titles by `(t.vote_average || 0) < 7.5`. `vote_average` is the TMDB user review score (0–10), NOT an age certification or maturity rating. High-rated family films like *Spider-Man: Across the Spider-Verse* (`8.4`) are blocked in Kids Mode, while lower-rated R-rated horror/thriller titles (`< 7.5`) are allowed through.
   - **Missing Enforcement**: `app/home/page.tsx`, `app/discover/AnimeDiscover.tsx`, `app/anime/[id]/page.tsx`, `components/SearchAutocompleteDropdown.tsx`, and all `/watch/*` routes do not filter or block adult/mature content when `currentProfile.kidMode` is enabled.

2. **[HIGH] Plaintext Password Storage in Local Auth Fallback**
   - **Location**: `lib/firebase.ts:309, 331`.
   - **Defect**: When Firebase credentials are not configured, `signupWithEmail` stores `{ email, password, name, uid }` with the raw plaintext `password` inside `localStorage` under `"zoku_registered_users"`.

3. **[HIGH] First-Time Playback Progress Never Recorded**
   - **Location**: `hooks/useWatchProgress.ts:62, 140`.
   - **Defect**: `playbackStarted` initializes to `urlStartAt > 0` (`false` when `t` is absent or `0`). When a user opens a movie or episode for the first time (`canResume === false`), the resume prompt never appears, `handleResume` / `handleStartOver` are never called, `playbackStarted` remains `false`, and `usePlayerProgressListener` stays disabled (`enabled: false`). Consequently, `postMessage` progress events from embedded players are ignored on first watch.

4. **[HIGH] Local Firestore Ordered Collection Listener Never Fires on Writes**
   - **Location**: `lib/firebase.ts:143, 558`.
   - **Defect**: `listenToOrderedCollection` registers callbacks under `dbListeners["${path}?orderBy=${orderByField}:${direction}"]`, whereas `triggerDbChange(path)` looks up `dbListeners[parentPath]` without the `?orderBy=` suffix. Any collection using `listenToOrderedCollection` (`continueWatching`, `watchHistory`, `episodeProgress`) in local fallback mode misses live reactive updates from `setDocument` / `removeDocument`.

5. **[HIGH] Unbounded Service Worker Cache Intercepting Third-Party & Dynamic Requests**
   - **Location**: `public/sw.js:91-118`.
   - **Defect**: The service worker intercepts all `GET` requests regardless of origin (only skipping `/api/` and `chrome-extension`) and caches any `200` response in `RUNTIME_CACHE`. This risks caching cross-origin embed player documents, Firebase/Firestore GET endpoints, or profile-specific responses.

6. **[MEDIUM] Hardcoded Fabricated Episode Duration in Anime Progress Hook**
   - **Location**: `hooks/useAnimeWatchProgress.ts:161, 165`.
   - **Defect**: `markCompleted` and `resetEpisodeProgress` pass hardcoded `1440` seconds (`saveProgress(1440, 1440, "completed")`) even when no real duration was reported by the player.

7. **[MEDIUM] Incomplete Profile Deletion Cleanup**
   - **Location**: `stores/index.ts:276-297`.
   - **Defect**: `deleteProfile(id)` deletes only `users/{uid}/profiles/{id}` without removing subcollection documents (`watchlist`, `continueWatching`, `watchHistory`, `episodeProgress`, `searchHistory`) or profile-scoped `localStorage` keys (`zoku_search_history_{uid}_{id}`).

8. **[MEDIUM] Firestore Rules Schema Gaps**
   - **Location**: `firestore.rules:27-57, 79-91`.
   - **Defect**: `validProfileFields()` omits `appearancePreference`; `validWatchlistItem()` omits `creator`, `genres`, and `release_date`; `watchHistory` and `episodeProgress` subcollections lack field-level validation helpers.

### Suspected / Environmental Risks

1. **Async Race Conditions on Fast Profile or Filter Switching**: Several `useEffect` hooks in `app/home/page.tsx`, `app/discover/page.tsx`, `app/discover/AnimeDiscover.tsx`, and `app/genre/[id]/page.tsx` lack cleanup cancellation flags (`cancelled = true`), allowing slow responses from a previous profile or filter selection to overwrite current state.
2. **Iframe `onLoad` Misinterpretation**: In `app/watch/*`, `onLoad` on the `<iframe>` only signals that the outer iframe document shell has loaded, not that video playback has started inside the cross-origin third-party embed. UI messaging must clearly distinguish container readiness from confirmed playback.

---

## 4. Functionality Requiring External Credentials, Browser, or Device Access

- **Live Firebase Authentication & Cloud Firestore**: Requires valid `NEXT_PUBLIC_FIREBASE_*` project credentials and authorized domains for Google OAuth popup sign-in. Local fallback mode is automatically used when credentials are absent.
- **Live TMDB API v4 Metadata**: Requires a valid `NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN` JWT (`eyJ...`). When absent or offline, `lib/tmdb.ts` deterministically falls back to curated real-ID TMDB catalog data (`FALLBACK_MOVIES`, `FALLBACK_TV`).
- **Third-Party Streaming Providers (`vidlink`, `vidsrc`, `2embed`, `filmu`, etc.)**: Require live browser network access to external streaming hosts and cannot be deterministically controlled or inspected from within the application due to cross-origin iframe isolation.
- **Physical Android TV / D-Pad Hardware**: Directional key navigation (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, `Escape`/`Back`) can be unit- and browser-tested via keyboard events, while physical remote latency and overscan require physical TV hardware.

