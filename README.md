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
