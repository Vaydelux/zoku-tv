# Zoku TV — Quality Assurance & Device Verification Matrix

## 1. Automated Verification Results (Observed)

| Check / Suite | Command | Observed Result | Details |
| --- | --- | --- | --- |
| **Strict TypeScript & JSX Check** | `npm run typecheck` | **PASS (Exit Code 0)** | All routes (`app/**`), components (`components/**`), stores (`stores/**`), hooks (`hooks/**`), and domain modules (`lib/**`) compile cleanly with `strict: true`. |
| **Unit & Domain Test Suite** | `npm test` | **PASS (66/66 tests, 18 suites)** | Covers autocomplete, TMDB/AniList helpers, embed URLs, episode progress, Kids Mode classification, network status, runtime guards, credential hashing, profile isolation, Firestore rules validation, 18 themes, TV directional navigation, watch history, and watchlist search/sorting/analytics. |
| **External Embed Contract** | [`lib/embed.test.ts`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/lib/embed.test.ts) | **PASS (4/4 tests)** | Asserts unmodified movie, TV, and anime embed URLs, default query params, and `startAt` resume parameters. |
| **Kids Mode Restrictions** | [`lib/kids-mode.test.ts`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/lib/kids-mode.test.ts) | **PASS (6/6 tests)** | Verifies high-rated PG/Animation titles (`Spider-Man: Across the Spider-Verse`) are permitted while R/TV-MA titles (`Oppenheimer`, `Breaking Bad`), restricted genres, and unrated titles are blocked. |
| **Security & Profile Isolation** | [`lib/security-isolation.test.ts`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/lib/security-isolation.test.ts) | **PASS (4/4 tests)** | Verifies salted SHA-256 credential hashing, full profile subcollection/cache purge on deletion, live local ordered listener notifications, and `firestore.rules` schema checks. |
| **TV Spatial & Grid Navigation** | [`lib/tv-navigation.test.ts`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/lib/tv-navigation.test.ts) | **PASS (3/3 tests)** | Verifies 2D grid index movement and spatial D-pad nearest-candidate selection. |

---

## 2. Route & Feature Verification Matrix

| Route | Desktop (1440×900) | Tablet (768×1024) | Mobile (390×844) | TV / 10-Foot (1920×1080) | Kids Mode Enforcement |
| --- | --- | --- | --- | --- | --- |
| `/login` & `/signup` | Verified layout, Cloud vs. Local Mode banner, password visibility toggle | Verified centered card | Verified single-column form & touch targets | Verified keyboard tab/enter flow | N/A (Pre-profile) |
| `/profiles` | Verified profile grid, avatar & color picker, `ConfirmDialog` delete flow | Verified 2–3 col grid | Verified 2-col responsive grid | Verified ArrowLeft/Right/Up/Down focus navigation | Displays `KIDS` badge on Kids profiles |
| `/home` | Verified hero banner, `From Your Watchlist` rail, compact theme indicator | Verified responsive rails | Verified mobile drawer & touch scroll | Verified focus ring visibility & rail scroll | Filters hero, trending, watchlist preview, and genre rails |
| `/discover` & `/genre/[id]` | Verified TMDB & Anime filter controls, pagination, and sort | Verified 3–4 col poster grid | Verified 2-col poster grid | Verified keyboard focusable filter pills & cards | Blocks restricted genre IDs & mature titles |
| `/search` & Autocomplete | Verified live dropdown (`role="listbox"`) + full results tabs | Verified dropdown & tabs | Verified mobile search bar | Verified ArrowUp/Down/Escape in autocomplete | Filters both live suggestions and full search results |
| `/title/[type]/[id]` & `/anime/[id]` | Verified maturity badge, cast, seasons, recommendations | Verified stacked hero metadata | Verified thumb-friendly action buttons | Verified focusable primary actions | Renders `Restricted in Kids Mode` gate for mature titles |
| `/watchlist` | Verified live title/creator search, sort dropdown, and D3 Analytics charts | Verified 2-column D3 chart layout | Verified stacked D3 donut + bar charts | Verified keyboard card actions | Respects active catalog mode |
| `/history` | Verified filter pills, Rewatch action, and `ConfirmDialog` clear history | Verified responsive cards | Verified touch action buttons | Verified keyboard navigation | Respects active catalog mode |
| `/watch/**` (Movie, TV, Anime) | Verified `Now Watching` header, 16:9 frame, `Container Ready` vs `Playback Synced` badge, `ServerSelect`, `Retry`, `Next Server`, `Previous`/`Next >`, and 3-column `Episodes` grid | Verified responsive control bar & 2-col episodes | Verified stacked control bar & 1-col episodes | Verified keyboard `ServerSelect` listbox & focus rings | Blocks direct URL access to mature titles with `Restricted in Kids Mode` gate |
| `/settings` | Verified 7-tab sidebar (Appearance, Browsing, Genre Rails, Profiles, Playback, Privacy & Data, Diagnostics) | Verified scrollable tab bar | Verified mobile tab pills | Verified keyboard tab switching | Allows toggling Kids Mode per profile |

---

## 3. Manual Playback Verification Procedure

Because third-party embed iframes are external black boxes, perform the following manual smoke test after deployment:

1. Open `/watch/tv/95396/1/4` (or any TV series episode).
2. Confirm the header displays **`Now Watching`** with subtitle `Severance · Season 1 · Episode 4` and status badge **`Loading Frame...`** transitioning to **`Container Ready`** upon iframe load.
3. Click **`Server ∨`** and verify keyboard (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`) and pointer selection across Recommended and All servers.
4. Click **`↻ Retry`** and confirm the iframe remounts cleanly.
5. Click **`Previous`** and **`Next >`** to verify episode routing (`/watch/tv/95396/1/3` and `/watch/tv/95396/1/5`).
6. Scroll to the **`Episodes`** section, switch seasons via the **`Season X ∨`** selector, and click an episode card in the 3-column grid.

