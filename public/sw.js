// Only cache public, static resources. Personalized HTML, auth and API responses
// must never be persisted in CacheStorage (including for offline navigation).
const SHELL_CACHE_NAME = "zoku-tv-public-v7";
const IMAGE_CACHE_NAME = "zoku-tv-images-v7";
const ACTIVE_CACHES = [SHELL_CACHE_NAME, IMAGE_CACHE_NAME];
const MAX_IMAGE_ENTRIES = 120;
const PUBLIC_IMAGE_HOSTS = new Set(["image.tmdb.org", "s4.anilist.co"]);
const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/api/pwa-icon?size=192&theme=theme-crimson",
  "/api/pwa-icon?size=512&theme=theme-crimson",
];

function cacheable(response) {
  if (!response || response.status !== 200) return false;
  const policy = response.headers.get("Cache-Control") || "";
  return !/(?:^|,)\s*(?:no-store|private)\b/i.test(policy) &&
    !response.headers.has("Set-Cookie");
}

async function trimImages() {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const entries = await cache.keys();
  if (entries.length > MAX_IMAGE_ENTRIES) {
    await Promise.all(entries.slice(0, entries.length - MAX_IMAGE_ENTRIES).map((entry) => cache.delete(entry)));
  }
}

async function cacheFirstImage(request) {
  // CacheStorage is optional. Clearing caches, storage restrictions and
  // quota failures must not prevent an otherwise valid network image.
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const saved = await cache.match(request);
    if (saved) return saved;
  } catch {
    // Continue to the network.
  }
  const response = await fetch(request);
  if (cacheable(response)) {
    try {
      const cache = await caches.open(IMAGE_CACHE_NAME);
      await cache.put(request, response.clone());
      await trimImages();
    } catch {
      // CacheStorage quota failures must never break image loading.
    }
  }
  return response;
}

async function networkFirstPublicAsset(request) {
  try {
    const response = await fetch(request);
    if (cacheable(response)) {
      try {
        const cache = await caches.open(SHELL_CACHE_NAME);
        await cache.put(request, response.clone());
      } catch {
        // Never turn a successful network response into an error.
      }
    }
    return response;
  } catch {
    try {
      const cache = await caches.open(SHELL_CACHE_NAME);
      return (await cache.match(request)) || Response.error();
    } catch {
      return Response.error();
    }
  }
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // Offline or missing public icons: allow installation and retry online.
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name.startsWith("zoku-tv-") && !ACTIVE_CACHES.includes(name))
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_CACHES") {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(
        names.filter((name) => name.startsWith("zoku-tv-")).map((name) => caches.delete(name))
      ))
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Never serve a previous account's/profile's HTML from an offline cache.
  // The explicit no-store fallback is safe even when the network is down.
  if (sameOrigin && request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => new Response(
        "Offline: reconnect to load Zoku TV. Account and profile pages are not saved for offline access.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } }
      ))
    );
    return;
  }

  if (sameOrigin) {
    // Next.js RSC payloads, API responses, session data and build chunks are never SW-cached.
    if (url.pathname.startsWith("/_next/") ||
        url.pathname.startsWith("/api/") && url.pathname !== "/api/pwa-icon" ||
        request.headers.get("RSC") === "1" ||
        url.searchParams.has("_rsc")) return;

    if (url.pathname === "/manifest.webmanifest" || url.pathname === "/api/pwa-icon") {
      event.respondWith(networkFirstPublicAsset(request));
      return;
    }
    const staticImage = /^\/(?:avatars|assets)\/.+\.(?:png|jpe?g|gif|svg|webp|ico)$/i.test(url.pathname);
    if (staticImage) event.respondWith(cacheFirstImage(request));
    return;
  }

  // Native no-CORS <img> responses are opaque and cannot pass cacheable().
  // Leave them on the browser HTTP cache, without service-worker interception.
  if (request.mode === "no-cors") return;

  // Only established public poster CDNs may use the image cache.
  if (url.protocol === "https:" && PUBLIC_IMAGE_HOSTS.has(url.hostname) &&
      request.destination === "image") {
    event.respondWith(cacheFirstImage(request));
  }
});
