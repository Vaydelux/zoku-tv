# Zoku TV — Reference Fidelity Audit (Phase 2)

Reference inspected from the user-supplied `workspace-3510d446-f68c-4c94-aaae-b4c57f27212b.tar`, including its actual `src/components/design/patterns/` components, `src/components/screens/` composition, `src/app/globals.css`, and reference screenshots in `.verification/`. Direct live preview retrieval was unavailable; **source and screenshots were inspected**, not the remote live DOM.

## Diagnosis

PR #5 introduced Zoku-compatible cinematic tokens and portrait media cards, but retained a different information architecture: a persistent multi-row Home command deck, heavy system-status navbar, large Watchlist analytics, desktop Settings sidebar, inconsistent anime hero, and a large technical footer. Those were the primary reasons it did not resemble the reference despite some matching styles.

## Structural corrections in PR #6

| Screen/component | Observed reference | Zoku implementation in this PR |
| --- | --- | --- |
| Desktop header | 64px low-noise logo, five nav links, icon-only search/appearance/profile | Minimal brand-neutral Zoku lockup; utilities moved into existing profile dropdown; small search + mode controls |
| Phone header | Small logo, theme toggle, avatar, bottom 5 tabs | Same responsive presentation; existing voice search remains in Search page |
| Home hero | Full-width ~70–74svh backdrop, deep lower/left scrim, title/metadata/actions, left-aligned dots | Updated TMDB hierarchy and proportions; dedicated AniList carousel uses same composition, stores and guarded routes |
| Home below hero | Continue watching and simple catalog rails; no permanent floating command deck | Compact Movies & TV / Anime switcher; the existing full rail filters/sorting and profile counters remain accessible in native expandable "Customize feed" |
| Media rail/cards | 2:3 poster, compact title/year/rating, Play and Bookmark overlay, simple arrows | Shared poster with independently focusable Play, Details, Watchlist, and watched state; avoids nested buttons; 44px touch targets |
| Search | Reading-width heading and field, content-type pills, horizontal genre chips, poster results | Real cross-provider genre-chip filtering using TMDB numeric genres and AniList genres, with no extra network queries; policy and Kids Mode unaffected |
| Genres | Saturated matte genre tiles in 5-column desktop grid; artwork below | Theme-compatible distinct category tile hues, compact grid, real protected Discover links |
| Watchlist | Plain title, pill filters, posters; analytics absent | Prior analytics kept but progressively disclosed behind "Library insights" |
| Settings | Narrow centered grouped settings and minimal section selection | Existing settings retained, sidebar becomes compact horizontal section controls above centered settings content |
| Detail | Atmospheric poster/backdrop, story and metadata below | Movie/TV cinematic geometry refined; fixed missing cinematic scope on successful AniList detail route |
| Footer | One compact row, small brand info and links | Replaced oversized diagnostic panel with simple branded row; original metadata/streaming/legal/connection information remains in expandable disclosure |
| Classic fallback | N/A | Every new presentation rule is restricted to `data-zoku-layout="cinematic"`; `NEXT_PUBLIC_ZOKU_LAYOUT=classic` retains previous layout |

**Not imported:** reference's fictional titles, non-production art, hash routing, mock player/providers, sample settings, or local storage auth. All real production content policy enforcement, Firebase session, and player integrations remain authoritative.

## Release acceptance

This is a structural visual redesign, not a screenshot-identical clone. Zoku has real data, more features and user-selected themes; exact reference art, wording, profile model, and color branding intentionally differ. CI green alone cannot prove visual fidelity.

Before production acceptance verify:
1. Home desktop 1440×900 and phone 390×844: art extends fully to edges, title and action hierarchy readable, and feed switcher is compact; no large open command deck by default.
2. Genre hub 1440×900: 5-column colorful tiles, real live links; filters honor Kids and adult lock.
3. Search phone/tablet/desktop: genre and media chips work against real TMDB/AniList search results, no stale results after a query or profile change.
4. Watchlist and Settings: compact designs with full functionality; expansion of Library insights and Customize feed remains keyboard accessible.
5. Movie/TV/Anime detail → player: real IDs and eligibility checks are enforced; remote/keyboard navigation remains usable.
6. All 18 light/dark themes, reduced motion, 200% zoom, overflow and contrast; Android TV 1280×720/1920×1080 focus and performance.

**No production claim** should be made until Vercel is READY on the PR #6 merge commit. A rollback can redeploy the last known-good PR #5 deployment.
