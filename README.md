# Zoku TV

A cinematic, multi-profile entertainment discovery and streaming portal built with **Next.js 15 App Router**, **TypeScript**, **Tailwind CSS**, **Zustand**, **D3.js**, and **Firebase**. Browse Movies, TV Series (TMDB), and Anime (AniList), manage profile-isolated watchlists with live search and D3 analytics, track episode progress and watch history, and stream via external embed servers.

---

## Key Capabilities

- **Dual Catalog Architecture**: Seamlessly switch between **Movies & TV** (TMDB v4 API + resilient offline/fallback catalog) and **Anime** (AniList GraphQL API).
- **Multi-Profile Isolation & Real Kids Mode**:
  - Up to 5 profiles per account with customizable avatars, accent colors, 18 color themes, Dark/Light appearance modes, and per-profile genre rails.
  - Conservative **Kids Mode** content classification ([`lib/kids-mode.ts`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/lib/kids-mode.ts)) enforced across Homepage, Discover, Genre, Search, Autocomplete, Title/Anime Details, and Watch routes.
- **Watchlist Live Search & Interactive D3 Analytics**:
  - Real-time filtering by **title** or **creator / director / studio name** ([`app/watchlist/page.tsx`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/app/watchlist/page.tsx)).
  - Interactive **D3.js Analytics** ([`components/watchlist/WatchlistAnalyticsSection.tsx`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/components/watchlist/WatchlistAnalyticsSection.tsx)) visualizing media type distribution (Movies vs. TV vs. Anime donut chart) and top genre composition (horizontal bar chart).
- **Premium External Player Container**:
  - Responsive 16:9 cinema container ([`app/watch/[type]/[id]/[season]/[episode]/page.tsx`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/app/watch/%5Btype%5D/%5Bid%5D/%5Bseason%5D/%5Bepisode%5D/page.tsx)) with honest **`Container Ready`** vs. **`Playback Synced`** state indicators, keyboard-accessible server selector, frame retry, next-server fallback, and 3-column episode grid.
- **Cloud Sync & Local Device Mode**:
  - Full Firebase Auth & Firestore synchronization when configured, with automatic fallback to Local Device Mode using salted SHA-256 credential hashing (`hashLocalCredential`).

---

## Prerequisites

- **Node.js 20+**
- **[TMDB API](https://www.themoviedb.org/settings/api)** v4 Read Access Token (required as the server-only `TMDB_API_READ_ACCESS_TOKEN`; missing credentials fail closed)
- **(Optional) [Firebase](https://console.firebase.google.com/)** project for cloud authentication & cross-device sync

---

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## Scripts & Quality Gates

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js development server |
| `npm run typecheck` | Run strict TypeScript & JSX compiler validation (`tsc --noEmit`) |
| `npm test` | Run automated unit, domain, & security isolation test suite (`tsx --test lib/*.test.ts`) |
| `npm run build` | Build production Next.js bundle |
| `npm run start` | Start production Next.js server |
| `npm run validate` | Execute full CI validation pipeline (`typecheck` + `test` + `build`) |
| `npm run firebase:deploy:rules` | Deploy hardened [`firestore.rules`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/firestore.rules) |
| `npm run firebase:deploy:indexes` | Deploy [`firestore.indexes.json`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/firestore.indexes.json) |

---

## Engineering Documentation

- **Audit & Baseline**:
  - [`docs/audit/baseline.md`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/docs/audit/baseline.md)
  - [`docs/audit/architecture.md`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/docs/audit/architecture.md)
  - [`docs/audit/functional-inventory.md`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/docs/audit/functional-inventory.md)
  - [`docs/audit/risks.md`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/docs/audit/risks.md)
- **Design System & Accessibility**:
  - [`docs/design-system.md`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/docs/design-system.md)
- **Release & Operations**:
  - [`docs/release-readiness.md`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/docs/release-readiness.md)
  - [`docs/deployment.md`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/docs/deployment.md)
  - [`docs/qa-matrix.md`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/docs/qa-matrix.md)
  - [`docs/release-notes.md`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/docs/release-notes.md)


## Server-enforced TMDB catalog and adult-content policy

**Adult Content is OFF by default** (filtering ON). The catalog, recommendations, movie/TV title details, credits and videos are fetched through `/api/tmdb/[...path]` with a strict route allowlist. Movie and TV detail/child endpoints require server-side eligibility checks. The server reads the signed HttpOnly adult unlock cookie on each request; the client has no authority to override the content policy.

Configure the following in the **server environment** and in Vercel **Production and Preview**:

```env
TMDB_API_READ_ACCESS_TOKEN=your-private-v4-read-access-token
ADULT_CONTENT_PASSWORD=replace-with-a-long-unique-password
# Optional secret used for signing unlock cookies; 32+ characters
ADULT_CONTENT_SESSION_SECRET=
# Optional comma-separated supplemental TMDB movie IDs
BLOCKED_TMDB_MOVIE_IDS=
```

**Remove the legacy `NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN` once the new server-only credential is configured and the application has been deployed.** Because the old credential was published to browser bundles, consider rotating it at TMDB before removing the old Vercel variable. Do not paste tokens or passwords into chats or commit them to the repository.

When `ADULT_CONTENT_PASSWORD` is absent or invalid (fewer than 12 characters), content stays filtered and the adult unlock is unavailable. When configured, Settings permits a temporary four-hour unlock with an HttpOnly, SameSite Strict cookie; the password is verified on the server and basic per-instance brute-force protection is applied. Multiple serverless instances do not share attempt counters; use managed WAF/distributed rate limiting for production abuse resistance.

`/api/vivamax-ids` and the server catalog use TMDB `with_companies=149142`, `include_adult=true`, verify all pages, and fail closed on incomplete/expired company ID data. The company list also includes IDs from `BLOCKED_TMDB_MOVIE_IDS`. Server-side discover, trending and search responses remove known restricted movie IDs and adult-flagged records before returning metadata to clients. The browser separately filters saved/previously cached items but this client-only pass is not relied upon for authorization.

Direct Zoku movie URLs `/title/movie/:id` and `/watch/movie/:id` cannot fetch accepted movie details from the proxy when restricted, and their player is gated until eligibility succeeds. Related-title endpoints are filtered; parent credits/videos and TV season endpoints require parent-title verification. Current embed providers are external websites, outside Zoku's enforcement boundary.

**Production readiness:** Run `npm run validate`, add the server-only token in the deployment environment, and verify known blocked IDs in search, deep links, paginated browse, watch history and recommendations on a live preview. The server API allowlist is not a substitute for Firebase server authentication or distributed traffic protection. TMDB metadata may still omit some company or maturity classifications, so this is not guaranteed parental-control or age-verification software.

### Live acceptance check (after setting the server-only token)

After Vercel Preview and Production have `TMDB_API_READ_ACCESS_TOKEN` configured, run the smoke verifier against a deployed preview with the filter **ON** (Adult Content **OFF**):

```bash
ZOKU_BASE_URL=https://your-preview.vercel.app node scripts/verify-tmdb-policy.mjs
```

This verifies company sync, a blocked direct movie detail, restricted related-title endpoints, discovery filtering and query/path validation. It does not test browser-only history state, D-pad navigation or external embed-provider access. Do not mark the release as fully qualified until those are manually checked in a browser.

### AniList hentai and adult anime restrictions

AniList is included in the **same Adult Content OFF by default** setting, independent of Kids Mode. Zoku now fetches AniList results from the fixed-operation internal `POST /api/anilist` server endpoint, rather than arbitrary browser GraphQL. The endpoint requests AniList's `Media.isAdult`, `genres` and `tags { name isAdult }` fields; it blocks `isAdult` titles, Hentai and Ecchi genres, and explicit sexual-content tags (including adult-flagged tags, nudity and sexual violence). Missing maturity metadata fails closed. It filters browse/search/studio pages, recommendations and relations, and rejects restricted direct details; the anime watch iframe never mounts until the exact ID passes its server check. Saved watchlist, Continue Watching and history anime IDs are revalidated in batches before they are displayed, without deleting records.

AniList's server API is not an open GraphQL proxy: only `browse`, `studio`, `detail`, and batch `eligibility` operations are accepted. The password-authorized 4-hour unlock affects both TMDB and AniList. Optional server-only `BLOCKED_ANILIST_ANIME_IDS` provides a manually reviewed supplemental denylist. Kids Mode separately restricts additional genres and mature themes.

**Scope decision:** Mature horror and violence are not automatically classified as hentai; they remain under the existing Kids Mode rules unless AniList marks them adult-rated or with restricted sexual tags. AniList metadata can be incomplete, so this filter cannot guarantee that all inappropriate material has been classified. The external streaming provider is not controlled by Zoku.
