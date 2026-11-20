# Reliability remediation — 2026-11-20

## Baseline

- Base branch: `main`, commit `965fe92581b8486606ee96db51cadfd7e489a250`.
- Scope: service-worker cache isolation, profile deletion integrity, and TMDB TV specials routing.
- No change to server embed providers, existing account authentication, or branding.

## Bugs addressed

### 1. Service-worker privacy/cache bug

Previously, `public/sw.js` stored successful same-origin navigations, including pages that may reflect the active viewer/profile. Offline fallback could replay a page from a previous session. Same-origin image responses were cached without respecting `private` or `no-store` response directives, and their cache was unbounded.

Now:

- Navigation is always network-only with a generic no-store offline 503 response.
- Only public `/avatars/` and `/assets/` images, TMDB/AniList poster-CDN images, and the public PWA manifest/icons may enter CacheStorage.
- `private`, `no-store`, or `Set-Cookie` responses are not cached.
- The public image cache is capped at 120 entries; caching errors never block successful network responses.
- Version-4 caches are evicted at activation, preserving other applications' unrelated caches.

Trade-off: the application no longer offers offline access to previously visited HTML pages. This is deliberate because those pages can contain account-specific content. Public artwork remains cacheable.

### 2. Incomplete profile deletion reported as success

Cloud `purgeProfileData` previously omitted `serverConfig` and `collections`, swallowed subcollection deletion errors, and let the calling UI show a deletion success toast. The parent document could be deleted while child records remained.

Now:

- All seven profile-scoped Firestore subcollections are included.
- Failed cloud cleanup stops parent deletion; the error propagates through the session store.
- The profiles UI leaves the confirmation available and shows a retryable error notification.
- The existing local-demo test now checks that server config and custom collections are purged while sibling profile collections remain.

Caveat: deletion is not a global Firestore transaction. A mid-cleanup failure can partially remove child documents; the parent remains and the user can retry. A production-grade background deletion job would be required for very large profiles.

### 3. TV specials (season 0) returned HTTP 404

The TMDB allowlist accepted positive season numbers only, while TMDB uses season zero for special episodes. Season zero is now permitted; negative and non-canonical padded season values are still rejected.

## Validation completed

- Verified eight behavior checks against the actual modified service-worker script: no personalized HTML persistence, API bypass, no unknown-image interception, public caching, offline public-image fallback, no-store/private exclusion, offline navigation fallback, and non-whitelisted host bypass.
- Service-worker JavaScript syntax compilation passed.
- Reviewed exact branch file contents and confirmed deletion propagates failures and includes every currently defined Firestore subcollection.
- Added automated regression tests for service-worker isolation, profile collection cleanup, and season-zero parsing.

## Validation still required

The GitHub connector does not expose a local dependency tree or test runner, and this execution environment cannot resolve github.com for cloning. Therefore **the full repository typecheck, test suite, Next.js build, authenticated Firestore deletion, and browser/PWA install upgrade are not claimed as passing**.

Before merging, run from a clean checkout:

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Then verify in a Firebase Emulator or authorized staging project that a failing child deletion is surfaced and that the parent remains. Test successful deletion of a profile containing both collections and server settings. In a browser, install the new service worker, switch accounts, go offline, and confirm private HTML is never replayed. Confirm that old `zoku-tv-shell-v4` and `zoku-tv-images-v4` caches are removed.

## Rollback

Revert this PR if needed. Reverting the cache policy would reintroduce private HTML caching, so avoid doing that without an alternative account-safe offline strategy.
