const CACHE_NAME = "zoku-tv-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/favicon.ico"
];

// Install Event
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((err) => {
      console.warn("Service Worker pre-caching failed on install:", err);
    })
  );
});

// Activate Event - Clean up stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Service Worker: Clearing Old Cache", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Dynamic routing and offline caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  
  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 1. TMDB Image Assets Caching (Cache First with background revalidation)
  if (url.hostname === "image.tmdb.org" || url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((err) => {
            // Silent catch to prevent errors in background updates
            return null;
          });

          // Return cached response immediately if available, or wait for network fetch
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 2. Navigation Pages and local API routes (Network First falling back to Cache)
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cache successful GET responses for pages, stylesheets, scripts, and API routes
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline Fallback Handler
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // For navigation/page requests, serve the main document / index shell
          if (request.mode === "navigate") {
            return caches.match("/");
          }
          
          return new Response("Disconnected. Live feed currently offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain" }
          });
        });
      })
  );
});
