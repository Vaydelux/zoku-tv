# Zoku TV — Production Visual/Functional Acceptance

Release under test: **PR #5**, commit `0ca023a1c33d257d108f5f23695d69811d7e0977`  
URL: `https://zoku-tv.vercel.app`  
Follow-up UI/search fixes: **PR #6 (separate from the deployed release)**

## How to report a failure

Record: page URL, active profile (Kids/regular), selected theme and appearance, device/browser, viewport or TV resolution, expected behavior, observed behavior, reproduction steps, and screenshot. For video playback also record content type (movie/TV/anime), provider name, and whether the issue happens before/after seeking. Do not share authentication cookies, passwords, API tokens or private account information.

## Production acceptance matrix

| Area | Check | Expected |
| --- | --- | --- |
| Login and profiles | Sign in, change profiles, logout/back | No stale library or search results leaking between profiles |
| Home | Load movie/TV/anime rails and featured artwork | Titles readable; hero buttons and posters navigate correctly |
| Genres | Open Movies, TV, Anime; select a genre | Genre opens the real filtered Discover view without mock data |
| Search | Try a title, switch Movie/TV and Anime filters, use autocomplete/voice | Relevant posters, typed title readable, no hidden panels |
| Search states | No-match query and offline/retry | Clear loading and error messages; no stale restricted content |
| Watchlist | Save and remove a title; mark watched; switch History | Consistent state after refresh and browser back |
| Details | Movie, TV seasons, anime episodes | Scrim contrast, posters, actions and episode labels readable |
| Players | Begin playback; switch server; back/forward; subtitle/error UI | Existing provider and eligibility checks remain intact |
| Content restrictions | Locked explicit TMDB title, Vivamax title and AniList hentai ID | No restricted discovery/detail/iframe before authorization |
| Adult unlock | Valid unlock, then expire/relock | Restrictions reapply without showing stale results |
| Kids profile | Browse genres, search, direct links, history | Adult/horror/age-inappropriate content remains restricted |
| Themes | All 18 themes, light and dark variants | No forced black text or invisible control labels |
| TV | 1280×720 / 1920×1080 and D-pad Select/Back | Predictable focus order; controls never hidden |
| Mobile | 320/375/390/430px, portrait/landscape; open soft keyboard | Nav doesn't cover results; touch targets fit; no horizontal overflow |
| Tablet/Desktop | 768, 1024, 1280, 1440 and 1920px | Compact nav without collisions; rails scroll and buttons work |
| Accessibility | Keyboard Tab/Shift+Tab, reduced motion and 200% zoom | Visible focus, no trapped controls, no unexpected motion |

## Known difference after production release

Post-merge PR #6 targets search reliability and density. Until it is separately qualified and merged, **production PR #5** still uses its original one-poster-per-row mobile search/Discover/Watchlist grids, and the search page may still offer repeated Load More requests or retain older results during a provider failure. Those are known issues on the production snapshot; don't mistake PR #6's branch behavior for what is already deployed.

## Rollback

The `NEXT_PUBLIC_ZOKU_LAYOUT=classic` **build-time** flag restores classic navigation/card/hero presentation on a future deployment. It is *not* an in-browser toggle or an immediate rollback of a currently served production bundle. For an emergency, use Vercel's previous known-good deployment (before PR #5) or revert the merge and redeploy. Preserve authentication, adult-content API routes, and server-side policy on rollback.
