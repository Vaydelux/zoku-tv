# Visual QA Record — Zoku Cinematic UI

Date: 2026-11-14  
Scope: `fix/visual-audit-layout-defects` / PR #8  
Source reference: user-supplied Z.ai workspace and screenshots `final-home.png`, `home-mobile.png`, `genres.png`, `search-results.png`, and `settings-light-moss.png`.

## Inspection method and limits

1. Visually inspected the supplied **reference screenshots**, including desktop 1440×900 and mobile 390×844.
2. Reviewed the actual Zoku implementation at `main` (`4694b183`) and follow-up branch, specifically React components and scoped cinematic styles.
3. Rendered an **isolated geometry fixture**, not the authenticated production application, in local Chromium at 390×844, 768×1024, 1024×768, 1440×900. It uses representative Zoku component geometry and example artwork from the supplied reference. This validates responsive layout composition and catches prototype overflow; it **does not** establish pixel-level equivalence of Zoku's Next.js output.
4. Direct attempts to load both live public URLs through the available network clients were blocked by environment network restrictions. Production was also known to be serving an older Vercel deployment due to the daily deployment quota. Therefore no claims are made about real rendered production or authenticated media/playback.

## Measured isolated geometry results

| Viewport | Document width | Hero height | Rail section starts at | Navigation | Overflow |
| --- | ---: | ---: | ---: | --- | --- |
| 390×844 | 390px | 591px | 655px | Bottom tabs | None |
| 768×1024 | 768px | 758px | 822px | Bottom tabs | None |
| 1024×768 | 1024px | 568px | 632px | Top links | None |
| 1440×900 | 1440px | 666px | 730px | Top links | None |

For comparison, the reference desktop 1440×900 screenshot has a ~64px header and artwork through ~730px; its Continue Watching heading begins around 789px. The reference 390×844 screenshot has bottom navigation, a ~64px header, and the first rail heading around 697px. Differences in artwork, title length, subtitles and catalog selection affect placement.

## Confirmed code issues corrected

- Narrow tablet widths had five large desktop links plus utilities in a crowded header. The cinematic nav now switches to bottom tabs through 1023px. Classic mode unchanged.
- Search loaded 16:9 skeletons but rendered 2:3 poster cards. This caused a pronounced aspect-ratio layout shift. Placeholders are now 2:3.
- Search clear/voice/submit controls could encroach on entered text. Increased right-hand input space.
- Reference had Movies and Series as separate tabs. Zoku previously combined them. Four real-type tabs and catalog-specific genre chips now keep the correct TMDB/AniList mapping with test coverage.
- Reference shows centered Play with a top-right Watchlist bookmark. Previously both occupied the top-right corner and crowded short mobile posters. Watched control and progress remain independently accessible.
- TMDB featured hero had a **fourth Mark Watched button** absent from the reference, which could wrap the three-action row on mobile. Cinematic mode keeps Play, More info and Watchlist; watched remains available on cards/history and in classic layout.
- Hero slide dots were tiny 6–8px click targets. The visuals stay pill-shaped while the control target becomes 32×44px and focus-visible.
- Icon-only profile menu was missing a clear accessible label and expanded state. Added both.
- The compact Customize feed overlay lacked close-on-Escape/outside-click behavior. It now dismisses predictably and closes on catalog change.

## Verification boundaries

These changes do **not** alter authorization, adult-content policy, Firebase stores, TMDB/AniList proxy, Kids Mode, streaming providers or player URLs. Existing browser/TV tests and physical-device checks remain relevant, but the user should not be required to supply screenshots merely to discover routine source-code and responsive-layout mistakes.

Remaining to verify before claiming pixel-perfect fidelity: authenticated screenshot of the actual rebuilt Next.js app with real metadata at the above viewports; all 18 themes, light/dark appearances, no-image fallback; D-pad focus and playback on physical TV; provider failures. Distinguish CI success, geometry fixtures and a real production-browser acceptance test in release reports.
