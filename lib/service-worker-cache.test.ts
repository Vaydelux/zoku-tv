import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

type MockRequest = {
  url: string;
  method: string;
  mode: string;
  destination: string;
  headers: { get: (name: string) => string | null };
};
type MockEvent = {
  request: MockRequest;
  respondWith: (response: Promise<Response>) => void;
  waitUntil: (promise: Promise<unknown>) => void;
};

function bootServiceWorker(network: (request: MockRequest) => Promise<Response>) {
  const handlers = new Map<string, (event: any) => void>();
  const cacheData = new Map<string, Map<string, Response>>();
  const cacheFor = (name: string) => {
    if (!cacheData.has(name)) cacheData.set(name, new Map());
    const data = cacheData.get(name)!;
    return {
      match: async (request: MockRequest) => data.get(request.url),
      put: async (request: MockRequest, response: Response) => { data.set(request.url, response); },
      keys: async () => Array.from(data.keys()).map((url) => ({ url })),
      delete: async (request: { url: string }) => data.delete(request.url),
      addAll: async () => {},
    };
  };
  const caches = {
    open: async (name: string) => cacheFor(name),
    keys: async () => Array.from(cacheData.keys()),
    delete: async (name: string) => cacheData.delete(name),
    match: async (request: MockRequest) => {
      for (const name of cacheData.keys()) {
        const hit = await cacheFor(name).match(request);
        if (hit) return hit;
      }
      return undefined;
    },
  };
  const self = {
    location: { origin: "https://zoku.example" },
    addEventListener: (type: string, fn: (event: any) => void) => handlers.set(type, fn),
    skipWaiting: () => {},
    clients: { claim: async () => {} },
  };
  const script = fs.readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
  vm.runInNewContext(script, { self, caches, fetch: network, URL, Response, console }, { filename: "public/sw.js" });

  async function request(url: string, mode = "cors", destination = "") {
    let pending: Promise<Response> | undefined;
    const mockRequest: MockRequest = {
      url, method: "GET", mode, destination, headers: { get: () => null },
    };
    const event: MockEvent = {
      request: mockRequest,
      respondWith: (response) => { pending = Promise.resolve(response); },
      waitUntil: () => {},
    };
    handlers.get("fetch")!(event);
    return pending ? await pending : undefined;
  }

  return { request, cacheData, caches, handlers };
}

test("service worker never caches account pages, searches, or API responses", async () => {
  const sw = bootServiceWorker(async () => new Response("personalized profile page"));
  const page = await sw.request("https://zoku.example/settings", "navigate");
  assert.equal(await page?.text(), "personalized profile page");
  assert.equal(sw.cacheData.size, 0, "A private navigation must not enter CacheStorage");
  assert.equal(await sw.request("https://zoku.example/api/tmdb/search/multi?query=abc"), undefined);
  assert.equal(await sw.request("https://zoku.example/not-public.png"), undefined);
  assert.equal(sw.cacheData.size, 0);
});

test("offline navigation returns a generic, no-store response instead of another user's cached page", async () => {
  const sw = bootServiceWorker(async () => { throw new Error("offline"); });
  const response = await sw.request("https://zoku.example/profiles", "navigate");
  assert.equal(response?.status, 503);
  assert.match(await response!.text(), /reconnect/i);
  assert.equal(response?.headers.get("Cache-Control"), "no-store");
  assert.equal(sw.cacheData.size, 0);
});

test("public images cache successfully, while private/no-store responses never cache", async () => {
  let online = true;
  let calls = 0;
  const sw = bootServiceWorker(async () => {
    calls++;
    if (!online) throw new Error("offline");
    return new Response("poster");
  });
  const avatar = "https://zoku.example/avatars/one%20piece/onepiece%20(1).png";
  assert.equal(await (await sw.request(avatar, "cors", "image"))?.text(), "poster");
  online = false;
  assert.equal(await (await sw.request(avatar, "cors", "image"))?.text(), "poster");
  assert.equal(calls, 1, "Cache-first strategy avoids repeat public image requests");

  const guarded = bootServiceWorker(async () => new Response("sensitive", {
    headers: { "Cache-Control": "private, no-store" },
  }));
  await guarded.request("https://zoku.example/avatars/secret.png", "cors", "image");
  assert.equal(guarded.cacheData.get("zoku-tv-images-v7")?.size, 0);

  assert.equal(await sw.request("https://other.example/poster.png", "cors", "image"), undefined);
  assert.equal(await sw.request("https://image.tmdb.org/t/p/123.jpg", "cors", ""), undefined);
});

test("activation evicts previous Zoku caches without touching other applications", async () => {
  const sw = bootServiceWorker(async () => new Response("ok"));
  await sw.caches.open("zoku-tv-shell-v4");
  await sw.caches.open("another-app");
  let pending: Promise<unknown> = Promise.resolve();
  sw.handlers.get("activate")!({ waitUntil: (job: Promise<unknown>) => { pending = job; } });
  await pending;
  assert.equal(sw.cacheData.has("zoku-tv-shell-v4"), false);
  assert.equal(sw.cacheData.has("another-app"), true);
});


test("artwork still loads when CacheStorage.open or match fails", async () => {
  const sw = bootServiceWorker(async () => new Response("network poster"));
  const url = "https://zoku.example/avatars/recovery.jpg";
  const originalOpen = sw.caches.open;
  sw.caches.open = async () => { throw new Error("storage unavailable"); };
  assert.equal(await (await sw.request(url, "cors", "image"))?.text(), "network poster");
  sw.caches.open = async (name: string) => {
    const cache = await originalOpen(name);
    return { ...cache, match: async () => { throw new Error("cache cleared"); } };
  };
  assert.equal(await (await sw.request(url, "cors", "image"))?.text(), "network poster");
});

test("opaque remote image requests bypass the service worker and use the browser network", async () => {
  const sw = bootServiceWorker(async () => { throw new Error("must not intercept"); });
  assert.equal(await sw.request("https://image.tmdb.org/t/p/w500/example.jpg", "no-cors", "image"), undefined);
  assert.equal(await sw.request("https://s4.anilist.co/file/example.jpg", "no-cors", "image"), undefined);
  assert.equal(sw.cacheData.size, 0);
});
