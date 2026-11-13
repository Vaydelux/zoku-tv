# Zoku TV — Post-Merge Stabilization and Design Adoption Plan

Status: Planned (design work not implemented)  
Prepared: 2026-11-14  
Source specifications: user's CineX/Cinecho component inventory and Zoku reference-informed design architecture documents.  
Scope: Preserve **Zoku TV** branding, existing themes, TMDB/AniList, Firebase profiles, Kids Mode, player providers, watch progress, D-pad support, and current route topology. The reference shell/navigation is partially observable; proposed layouts are not verified copies.

## Release boundary

**Release A (PR #3):** Merge the adult-content filter fixes only after typecheck, unit tests and production build pass. Treat filtering as best effort until a server-owned catalog and routing policy is deployed. Default state is **Adult Content OFF** (filter active); unlocking requires a server-side password. Vivamax TMDB company ID 149142 and associated movie IDs are excluded when filtering is active.

**Release B (separate security PR):** Enforce content policy at trusted server endpoints, move TMDB token off public clients, add centralized rate limiting and auditability. A browser-only filter is not an authorization boundary.

**Release C (separate design PRs):** Incrementally adapt presentation patterns from the attached design specifications. Do not mix the design refactor with security policy changes.

## Priority 0 — Production hardening / unfinished content-policy items

| Priority | Work | Acceptance gate |
| --- | --- | --- |
| P0 | Server-side TMDB catalog/proxy (no `NEXT_PUBLIC_` token required), with explicit movie and TV eligibility decisions | All client catalog requests use trusted server endpoints; filtered response contains no restricted movie IDs |
| P0 | Route protection for `/title/movie/:id` and `/watch/movie/:id` including refresh, back/forward, stale navigation and player embeds | Unauthorized direct requests never receive a playable embed; blocked titles remain blocked on reload |
| P0 | Production ID feed reliability: precompute/sync company ID 149142, add known alternate company IDs only with evidence, handle pagination limits, expiry, cold starts and failure states | Observed real TMDB IDs on first/middle/last discover pages match blocked list; never silently accept a truncated list |
| P0 | Distributed password attempt throttling, lockout/abuse monitoring, authorized-origin checks, secret rotation | Parallel requests on multiple instances cannot bypass the threshold; credentials are never logged/exposed |
| P1 | Revocation and cache invalidation on content-policy changes across search, home, genre, saved lists, PWA cache, player and multiple tabs | Adult OFF removes formerly unlocked results immediately without erasing persisted history/watchlist |
| P1 | Live integration tests with configured TMDB token + deployment settings; verify offline/error behavior and request budget | Direct links, paginated search, discover, watchlist, history and watch routes pass on deployed preview |

Do not claim this phase is finished until live, trusted-server checks have passed. Existing PR #3 adds client-visible filtering, cached company IDs and a scoped in-memory login throttle, but those alone cannot enforce a security boundary.

## Priority 1 — Reference capture and baseline

1. Capture actual reference screenshots and DOM/computed CSS at desktop, tablet and mobile widths; label everything as measured [R] versus proposed [P]. The existing documents validate only the five navigation labels (Home, Search, Genres, Watchlist, Settings), not exact pixels.
2. Capture Zoku baseline screenshots for Home, Search, Discover, Watchlist, Settings, Movie/TV details and player, using dark/light plus representative themes.
3. Record accessibility, bundle size, LCP/CLS/INP, TV D-pad and ARM32 WebView baseline. Preserve current `lib/themes.ts`, `app/globals.css`, and `TVSpatialNavProvider`.

**Exit:** Evidence worksheet complete; no ungrounded pixel-fidelity claims.

## Priority 2 — Design foundation

1. Add thin semantic token aliases over existing Zoku themes, never a second hardcoded palette. Preserve all 18 themes and per-profile appearance.
2. Introduce domain-independent primitives only as needed: ActionButton, IconAction, MediaArtwork, SectionHeading, StatusBadge, EmptyContent and FocusableSurface. Avoid components that fetch TMDB/Firebase directly.
3. Add a canonical media view model with source-qualified IDs (`tmdb:movie:550`, `tmdb:tv:21`, `anilist:anime:21`) and type-aware route builders. Keep existing domain types and stores.

**Exit:** Theme contrast/keyboard tests pass, no player/store behavior changes.

## Priority 3 — Navigation, browse and responsive composition

1. Reuse `Navbar` and `TVSpatialNavProvider` to expose the five reference-derived destinations without duplicate mobile rows. A `/genres` route, if added, must be a facade over existing `/discover` / `/genre/:id`, not a new catalog.
2. Incrementally adapt `HeroCarousel`, `TitleCard`, `TitleRail`, `AnimeCard`, `AnimeRail` to display artwork, progress and CTA states with focus parity. Keep hover and D-pad accessible.
3. Adapt Search/Discover filters, watchlist organization and Settings sections. Keep content-policy, Kids Mode, authentication, Firebase and embed providers untouched in this design phase.

**Exit:** All existing bookmarks and deep links work; single mobile navigation; every interactive card works via touch/keyboard/D-pad.

## Priority 4 — Detail, player and release qualification

1. Adapt details, episodes and player shell presentation only. Do not broaden iframe sandbox permissions or change provider URLs as part of design.
2. Test responsive scenarios at 375x812, 430x932, 768x1024, 1280x800, 1920x1080 and TV 1280x720; include 18-theme contrast smoke tests, image failures, offline, long labels and reduced motion.
3. Run `npm run typecheck`, `npm test`, `npm run build`, cross-browser smoke checks and Android TV D-pad focus tests.
4. Roll out a presentation-only variant flag (e.g., `NEXT_PUBLIC_ZOKU_UI_VARIANT=classic|cinematic-v2`) until baseline parity is verified; then remove the flag. Never use it for authorization.

**Exit:** No material usability, video-playback, memory, accessibility, security, or route regressions. Do not deploy/merge design changes until review evidence exists.

## Suggested PR sequence

- **PR #3:** Content filter and immediate regression fixes (merge after green CI).
- **Next PR — Content-policy server boundary:** server catalog proxy, authorization, distributed protection, real TMDB integration tests.
- **Design PR A:** Reference evidence, screenshots, semantic tokens + view model.
- **Design PR B:** Navigation / Genres facade / TV focus and responsive behavior.
- **Design PR C:** Media cards, rails and page compositions.
- **Design PR D:** Details/player presentation, visual regression and performance gate.

Each PR should preserve the ability to roll back independently. Brand assets/logos and proprietary artwork from the reference are not to be copied.

## Known limitations and assumptions

- The supplied design references are blueprints, not extracted pixel-perfect copies; the source reader could not fully render CineX/Cinecho.
- Current TMDB integrations have a public client token and direct client requests. Policy checks and external iframe playback require server-side restructuring for enforceable restriction.
- An in-memory rate limiter is useful only per running instance. Add a distributed store or managed firewall before advertising robust brute-force protection.
- Missing TMDB production-company/certification data can still cause false negatives; preserve a reviewed movie-ID denylist and provide an operational refresh path.
