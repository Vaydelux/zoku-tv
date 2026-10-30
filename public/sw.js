const CACHE_NAME = "zoku-tv-shell-v4";
const IMAGE_CACHE_NAME = "zoku-tv-images-v4";
const ACTIVE_CACHES = [CACHE_NAME, IMAGE_CACHE_NAME];
const MAX_IMAGE_ENTRIES = 120;

const ALLOWED_IMAGE_HOSTS = new Set(["image.tmdb.org", "s4.anilist.co"]);

const ASSETS_TO_CACHE = [
  "/manifest.webmanifest",
  "/api/pwa-icon?size=192&theme=theme-crimson",
  "/api/pwa-icon?size=512&theme=theme-crimson",
];

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const excess = keys.slice(0, keys.length - maxEntries);
      await Promise.all(excess.map((key) => cache.delete(key)));
    }
  } catch {
    // Ignore cache trim errors
  }
}

// Install Event
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .catch((err) => {
        console.warn("Service Worker pre-caching failed on install:", err);
      })
  );
});

// Activate Event - Clean up stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (!ACTIVE_CACHES.includes(name)) {
              return caches.delete(name);
            }
            return Promise.resolve(false);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Support explicit cache clearing from Settings / Diagnostics
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_CACHES") {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
    );
  }
});

// Fetch Event - Strict public-only caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // 1. Public poster/backdrop CDNs (Cache First with bounded eviction)
  if (!isSameOrigin) {
    if (ALLOWED_IMAGE_HOSTS.has(url.hostname)) {
      event.respondWith(
        caches.open(IMAGE_CACHE_NAME).then((cache) =>
          cache.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  cache.put(request, networkResponse.clone());
                  void trimCache(IMAGE_CACHE_NAME, MAX_IMAGE_ENTRIES);
                }
                return networkResponse;
              })
              .catch(() => null);

            return cachedResponse || fetchPromise || Response.error();
          })
        )
      );
    }
    // Never intercept or cache cross-origin APIs, Firebase Auth/Firestore, or third-party embed streams
    return;
  }

  // 2. Never intercept Next.js build/HMR chunks, RSC flight payloads, or non-icon API routes
  if (
    url.pathname.startsWith("/_next/") ||
    request.headers.get("RSC") === "1" ||
    url.searchParams.has("_rsc") ||
    (url.pathname.startsWith("/api/") && url.pathname !== "/api/pwa-icon")
  ) {
    return;
  }

  // 3. PWA manifest and themed icons (Network First with cache fallback)
  if (url.pathname === "/manifest.webmanifest" || url.pathname === "/api/pwa-icon") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 4. Same-origin static image assets (Stale-While-Revalidate)
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) =>
        cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => null);

          return cachedResponse || fetchPromise || Response.error();
        })
      )
    );
    return;
  }

  // 5. Same-origin navigation requests only (Network First with honest offline fallback)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match("/home").then(
              (homeCached) =>
                homeCached ||
                new Response(
                  "Offline: Zoku TV cannot reach the network and this route is not cached locally.",
                  {
                    status: 503,
                    headers: { "Content-Type": "text/plain; charset=utf-8" },
                  }
                )
            );
          })
        )
    );
  }
});
