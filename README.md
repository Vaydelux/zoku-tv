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
- **[TMDB API](https://www.themoviedb.org/settings/api)** v4 Read Access Token (optional for local development — built-in authentic catalog fallback activates automatically when omitted)
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
| `npm test` | Run automated unit, domain, & security isolation test suite (`tsx --test "lib/**/*.test.ts"`) |
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


## Adult-content filter

The Movies & TV catalog filters known restricted content by default, independently of Kids Mode. The filter combines TMDB adult flags, known Vivamax/VMX company IDs, release certifications, selected keyword IDs and optional movie IDs. TMDB metadata is incomplete and this is a best-effort filter, not an age-verification or guaranteed parental-control boundary.

To permit an optional temporary unlock, configure a **server-only** environment variable in `.env.local` (and Vercel Environment Variables when deployed):

```env
ADULT_CONTENT_PASSWORD=replace-with-a-long-unique-password
NEXT_PUBLIC_BLOCKED_TMDB_MOVIE_IDS=
```

The password must be 12 characters or longer. Never use `NEXT_PUBLIC_ADULT_CONTENT_PASSWORD` or commit real secrets. Open **Settings → Profiles & Kids Mode → Adult Content Filtering** and enter the password to disable the filter for this browser for up to four hours. Re-enable filtering without a password. With no configured password, filtering remains enabled and cannot be switched off through Settings.

The current TMDB integration is client-side and uses a public client token. This setting controls Zoku TV's displayed catalog, **not access to the underlying TMDB API**; stronger enforcement requires moving catalog requests and detail/watch authorization to server-side endpoints. Changes to the filter invalidate home and search session caches, but existing browser history or saved watchlist items are not retroactively deleted.

### Vivamax company movie ID sync

`GET /api/vivamax-ids` queries TMDB Discover Movie with `with_companies=149142` and `include_adult=true`, paginates results, deduplicates movie IDs, and caches the successful catalog in server memory for 24 hours. The browser fetches the ID list before showing TMDB catalog results, so the known IDs are excluded from trending, search, discovery, recommendations, details, and the movie player. On a refresh failure, the last in-memory list is served if available. This covers titles assigned to this TMDB company, not titles released under other company IDs or missing TMDB company attribution. It is not a license or DRM enforcement mechanism.

For production, set `TMDB_API_READ_ACCESS_TOKEN` on the server. The endpoint currently falls back to `NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN` for compatibility with the existing client API implementation. Move all TMDB calls server-side in a follow-up hardening pass. The company ID sync uses the shared server deployment's in-memory snapshot, which resets on cold starts.

### Direct-route protection with adult content OFF

The default state is **adult content OFF** (filter ON). Movie lists are filtered before rendering, including successive Discover/Search result pages. Direct `/title/movie/:id` and `/watch/movie/:id` navigation must pass catalog sync and the TMDB detail metadata filter; the movie watch UI does not render its external embed until eligibility succeeds. If the company ID list cannot be verified, movie catalog display and direct movie routes fail closed until verification is available. This prioritizes blocking unverified material over availability. Existing watchlist/history entries may remain in local data; their movie watch routes are still gated. Because catalog metadata and player embeds are client-side, these protections do not prevent a technically knowledgeable user from opening an external embed-provider URL directly.
