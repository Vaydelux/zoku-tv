# Zoku TV — Fluent Cinematic Redesign: Component Architecture and Migration Plan

Status: **UI implementation completed on feature branch; real browser and TV visual acceptance pending** · 2026-11-14  
Reference: user-supplied `workspace-3510d446-f68c-4c94-aaae-b4c57f27212b.tar` and screenshots inside `.verification/`.  
Live reference: `https://preview-chat-3510d446-f68c-4c94-aaae-b4c57f27212b.space-z.ai/` (remote fetch unavailable; local source/screenshots were inspected).  

## 1. Decision

Adopt the reference **visual grammar and interaction architecture**, **not** its codebase, sample content, or route/state system. Zoku retains its brand, 18 themes, profile and Firebase stores, TMDB/AniList server-policy APIs, Kids Mode, adult-content restrictions, real streaming embeds, viewing history, existing routes, PWA, and TV D-pad navigation. The design reference's fictional catalog, procedural placeholders, hash router, browser-only settings state, and mock player are **not** replacements for production services.

Visual principles: artwork-led, intentionally quiet chrome, readable typography, one primary action per region, lightweight surfaces, predictable navigation, smooth but restrained motion, touch/keyboard/TV equivalence. Do not force the reference's orange accent: Zoku's existing `--primary` and other theme tokens remain authoritative.

## 2. Evidence actually extracted

| Area | Observed reference | Target adaptation |
| --- | --- | --- |
| Header | ~64px compact sticky header, slim active underline, five destinations, search/theme/profile actions | Keep `components/Navbar.tsx`, migrate to Home / Search / Discover (genre browse) / Watchlist / Settings; preserve network, TV performance and profile controls |
| Home | ~70–74svh cinematic full-bleed hero, left-aligned copy, image scrims, badges, play/more info/save, compact progress indicators | Restyle `HeroCarousel` and `AnimeHeroBanner` without rewriting timers, watchlist, watch history or route permissions |
| Catalog | 2:3 posters, simple metadata underneath, light hover controls, horizontal rails, scroll arrows | Evolve `TitleCard`, `AnimeCard`, `TitleRail`, `AnimeRail` behind shared presentational styles; never nest interactive controls |
| Search | Large focused search field, media tabs, scrollable genre chips, straightforward results and ordering | Restyle existing `/search` and `/discover` data and pagination; autocomplete/voice search remain |
| Genres | Compact colorful genre tiles leading to a filtered catalog | Optional `/genres` façade over `/discover`; do not clone media catalogs or introduce duplicate API requests |
| Detail | Wide atmospheric backdrop, left title/actions, separate poster/metadata, episodes and recommendations | Restyle existing TMDB and AniList title pages, maintain server-content policy and episode IDs |
| Player | Immersive minimal top controls, error/status feedback and server selection | Restyle existing player shell only; retain video iframe security, providers, sandbox behavior, subtitles, playback state |
| Settings | Low-noise grouped surface sections, light/dark/accent options | Reorganize existing 18-theme controls into clearer groups; never replace secure settings with prototype local storage |
| Mobile | Fixed five-item bottom nav, condensed hero, touchable controls; no stacked duplicate nav row | Keep one bottom tab bar with safe-area inset and top utility header; maintain TV D-pad accessibility |
| Accessibility | Focus-visible, aria labels, reduced motion, keyboard focus handling | Preserve and strengthen keyboard/TV focus, 44px-equivalent touch targets, contrast and reduced-motion behavior |

Reference evidence sizes: `final-home.png`, `genres.png`, `search-results.png`, `detail-hollow-creek.png`, `watchlist.png`, `settings-light-moss.png` are 1440×900; `home-mobile.png` is 390×844. These are screenshots of a **prototype**, not a guaranteed pixel map of the live Zoku site.

## 3. Design tokens and layout

**Never introduce a parallel palette.** Use Zoku's existing runtime CSS roles and all 18 dark/light themes.

| Semantic alias | Maps to |
| --- | --- |
| `--cinematic-canvas` | `var(--background)` |
| `--cinematic-panel` | `var(--surface)` |
| `--cinematic-ink` | `var(--on-surface)` |
| `--cinematic-muted` | `var(--on-surface-variant)` |
| `--cinematic-accent` | `var(--primary)` |
| `--cinematic-accent-ink` | `var(--primary-contrast)` |
| `--cinematic-stroke` | `var(--border-color)` |
| `--cinematic-gutter` | `clamp(16px, 3vw, 48px)` |

Recommended restrained geometry: header 64px (mobile 56px), fixed mobile nav 64px + device safe area, hero 66–74svh (mobile 62–70svh), media poster ratio 2:3, continue-watching art 16:9, section gap 32–48px, cards with 10–14px radius, controls with 8–12px radius, no artificial page-width cap on rails.

Use low-shadow, low-blur surfaces; keep darker scrims on image regions only. For light themes, derive foreground and panel backgrounds from semantic tokens rather than forcing white type or black surfaces. Never override an accessibility ring with decorative glow. Do not apply transitions to `all` or animate heavy backdrop filters on TV hardware.

## 4. Component composition (presentation only)

```text
RootLayout (existing auth + themes + PWA + policy unchanged)
└─ SiteChrome
   ├─ Navbar (existing behavior, redesigned header)
   │  ├─ ZokuLogo (original logo)
   │  ├─ DesktopNav (Home, Search, Discover, Watchlist, Settings)
   │  ├─ Search/VoiceSearch (existing logic)
   │  ├─ Network + TV performance indicators (existing logic)
   │  └─ ProfileMenu (existing logic)
   ├─ Current page
   │  ├─ Home
   │  │  ├─ CinematicHero (existing HeroCarousel/AnimeHeroBanner)
   │  │  ├─ Existing rail selector/filter toolbar
   │  │  ├─ ContinueWatchingRail (existing stores)
   │  │  └─ MediaRails (TMDB/AniList typed cards)
   │  ├─ Search / Discover (existing API + adult filters)
   │  ├─ Watchlist (existing profile/store/filter)
   │  ├─ Title/AnimeDetail (existing guarded routes)
   │  ├─ Watch (existing guarded iframe/player)
   │  └─ Settings (existing secure controls)
   ├─ SiteFooter (existing)
   └─ MobileTabBar (new presentation; one nav instance only)
```

Typed identifiers remain provider-qualified. Keep `tmdb:movie:{id}`, `tmdb:tv:{id}`, `anilist:anime:{id}` in any *new* view-model adapter, but do not mutate existing database IDs or URL paths.

### Shared primitive proposals (adapt incrementally)

- `CinematicNavLink`: URL-derived active state + `aria-current` and D-pad focus handling.
- `CinematicAction` and `CinematicIconAction`: primary, secondary and quiet actions with accessible labels.
- `CinematicMediaArtwork`: poster/backdrop proportions, lazy loading, stable placeholders.
- `CinematicBadge`: trend, year, maturity, verified status—never mix policy with decoration.
- `CinematicSectionHeading`, `CinematicRail`, `CinematicEmptyState`, `CinematicSurface`: shared visual presentation, no API calls or store dependencies.

**Avoid abstracting functional components too early.** Keep existing domain containers and interactivity, replace only display layers as regression tests establish parity.

## 5. Responsive and TV rules

| Viewport | Header/nav | Hero | Cards |
| --- | --- | --- | --- |
| 320–479px phone | Compact top actions + one fixed five-item bottom tab bar | Main copy readable, full-bleed image, actions stack/wrap | 2:3 posters, 2-column grid or horizontal rail, controls always accessible |
| 480–767px large phone | Same | Art fills background, bottom scrim | More rail items visible |
| 768–1023px tablet | Desktop nav if space permits, otherwise compact | Image-first | 3-column browse, keyboard arrows |
| 1024–1919px desktop | 5-link header and utility actions | ~70svh hero | Scrolling rails + 4+ column grid |
| 1920px+ / TV | 10-foot usable spacing and focus visibility | Title/CTA within TV safe margins | D-pad edge wrap and focus restoration |

Viewport checks: 375×812, 390×844, 430×932, 768×1024, 1280×720 (TV), 1440×900 and 1920×1080. TV variants must avoid expensive blur and large composited backgrounds.

## 6. Delivery milestones and gates

### PR A — Visual foundation and navigation (implemented in draft PR #5)
- Document audited reference + Zoku component mappings and constraints.
- Add semantic `cinematic-` CSS styles using existing theme roles, scoped with `data-zoku-layout`.
- Add opt-out `NEXT_PUBLIC_ZOKU_LAYOUT=classic`. Default on redesign branch: cinematic. The flag affects **presentation only**.
- Convert desktop navigation to five links and mobile stacked link row to one bottom tab bar; retain search, voice, profiles, network and TV performance features.
- Restyle hero density and section surfaces without editing data fetching.
- Gate: typecheck + tests + build; manual visual checks on mobile/desktop/TV.

### PR B — Media artwork, rails and catalog composition (implemented in draft PR #5)
- Convert both movie and anime cards from wide preview to portrait poster-first, with short metadata outside the image, hover/TV actions maintained.
- Preserve completion/progress markers, watchlist controls, focus parity and all existing rail scrolling.
- Simplify search/discover filter controls and add Genre landing façade only if it improves navigation.
- Gate: TMDB/AniList media and saved-state regression matrix.

### PR C — Detail, player shell and settings (presentation implemented in draft PR #5)
- Match reference's atmospheric detail layout, restrained episode selector and error states.
- Adjust player *chrome only*: no iframe source, embed URL, sandbox, autoplay or security change.
- Redesign appearance settings with 18 themes, dark/light and profile-specific preferences.
- Gate: direct-route permissions, adult/Kids filtering, episodes, subtitles/players, D-pad, keyboard and touch.

### PR D — Cross-device qualification and release (automated checks added; real devices pending)
- Screenshot diffs for all major pages at reference and Zoku viewport sizes.
- Verify all 18 themes × light/dark, contrast, fallbacks and no unthemed hardcoded black text.
- Verify PWA, browser back, authenticated routing, search/pagination, continue watching, Watchlist persistence, logout/profile switch and adult unlock expiry.
- Check mobile bottom nav/keyboard overlap, slow network, TV memory budget and reduced motion.
- Release after visual approval and Vercel Preview checks; rollback by reverting CSS/flag and presentation commits.

## 7. Non-regression contract

No changes in this design series to:
- `/api/tmdb`, `/api/anilist`, adult-content session cookie or rate limiting;
- TMDB/Vivamax/AniList content restrictions (filter OFF by default);
- Firebase authorization, security rules, profile store or saved state schema;
- TMDB/AniList route identity, external streaming provider resolution or embed controls;
- TVSpatialNavProvider, memory/performance mode, PWA metadata and service workers.

The supplied prototype's fake movies, art, color palette, logo, name and hash routes must **not** be imported into Zoku. Use it as design reference only. Browser-only local storage is not a substitute for Zoku's identity or permission boundaries.

## 8. Known unresolved verification

- Remote preview URL could not be fetched by the available web reader; the attached workspace and reference screenshots were inspected directly.
- Pixel-perfect fidelity cannot be claimed without live DOM/computed-style inspection.
- No production deployment from this UI branch; it is isolated from `main` until tests, screenshots and approval.


## 9. Implementation and release acceptance

- Shared 2:3 poster card for TMDB and AniList, with native separate buttons for details, Watchlist, and watched status; progress indicators and responsive sizing.
- Five-destination navigation with a real `/genres` page, protected catalog links, safe-area mobile tab bar and keyboard/TV focus parity. Desktop nav is shown only above tablet widths to prevent collisions.
- Artwork-led home, quiet search, Discover, Watchlist, Settings, movie and anime detail, and dark theater player shell. No change to underlying embeds or policy endpoints.
- All 18 Zoku themes and dark/light variants preserved by semantic CSS roles; performance/reduced-motion overrides and existing TV optimization retained.
- Reversible build flag: `NEXT_PUBLIC_ZOKU_LAYOUT=classic` restores original visual components without data migration. The Genres route remains available directly but is not added to classic navigation.
- Automated coverage: `lib/design-navigation.test.ts`, `lib/cinematic-media-card.test.ts`, existing content/security tests, TypeScript and Next.js production build.

**Not yet established:** authenticated browser screenshots of all pages, viewport and mobile soft keyboard overlap, full 18-theme contrast evaluation, Android TV D-pad tests, and external provider playback acceptance. These remain release blockers for merging into production even when CI is green.

**Manual path:** Login → Home → Genres → Discover filter → Movie/Anime detail → Watch → Back → Search → Watchlist/History → Settings. Test locked and password-unlocked adult policy; compare at 390px, 768px, 1280px and 1440px, and test both mobile touch and TV remote.
