#!/usr/bin/env node
/**
 * Real Chromium release-candidate smoke of the built Zoku application.
 *
 * Runs against the local Next.js production server in **local demo mode**.
 * Mocked upstream catalog responses exercise UI and eligibility gates without
 * contacting or interacting with third-party streaming players. Separate
 * first-party API security probes hit unmocked application endpoints.
 *
 * No real accounts, cookies, passwords or tokens are stored in artifacts.
 *
 *   ZOKU_BASE_URL=http://127.0.0.1:3000 CHROME_PATH=/usr/bin/google-chrome \
 *     node scripts/rc-browser-smoke.mjs
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = new URL(process.env.ZOKU_BASE_URL || "http://127.0.0.1:3000");
if (!["localhost", "127.0.0.1", "::1"].includes(base.hostname)) {
  throw new Error("Browser acceptance runs only against a local release build; refusing remote accounts.");
}
const chrome = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const artifacts = process.env.RC_ARTIFACT_DIR || "artifacts/release-candidate";
await mkdir(artifacts, { recursive: true });
const failures = [];
const evidence = [];
const warningEvents = [];

async function assertApi(url, init, expected, description) {
  const response = await fetch(new URL(url, base), { signal: AbortSignal.timeout(10_000), ...init });
  assert.equal(response.status, expected, description + " returned " + response.status);
  evidence.push({ check: description, status: response.status, result: "pass" });
}
async function checkPolicyGuards() {
  const status = await fetch(new URL("/api/adult-content", base), { signal: AbortSignal.timeout(10_000) });
  assert.equal(status.status, 200);
  const body = await status.json();
  assert.equal(body.filterEnabled, true, "Adult content must default to locked");
  evidence.push({ check: "default adult lock", result: "pass" });

  const optInDenied = await fetch(new URL("/api/adult-content", base), {
    method: "POST",
    headers: { Origin: "https://attacker.invalid" },
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(optInDenied.status, 403, "Cross-origin request must not alter adult setting");
  const optedIn = await fetch(new URL("/api/adult-content", base), {
    method: "POST",
    headers: { Origin: base.origin },
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(optedIn.status, 200, "Same-origin preference toggle must work without password");
  assert.equal((await optedIn.json()).filterEnabled, false);
  const cookieHeader = optedIn.headers.get("set-cookie") || "";
  assert.match(cookieHeader, /zoku_adult_filter_unlock=on/, "Opt-in cookie must be set");
  assert.match(cookieHeader.toLowerCase(), /httponly/, "Preference cookie should be HttpOnly");
  assert.match(cookieHeader.toLowerCase(), /samesite=strict/, "Preference cookie should be same-site strict");
  const optedState = await fetch(new URL("/api/adult-content", base), {
    headers: { Cookie: "zoku_adult_filter_unlock=on" },
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal((await optedState.json()).filterEnabled, false, "Server must honor the opt-in cookie");
  const oldCookie = await fetch(new URL("/api/adult-content", base), {
    headers: { Cookie: "zoku_adult_filter_unlock=12345.abcdef" },
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal((await oldCookie.json()).filterEnabled, true, "Legacy cookie must fail closed");
  const optedOut = await fetch(new URL("/api/adult-content", base), {
    method: "DELETE",
    headers: { Origin: base.origin, Cookie: "zoku_adult_filter_unlock=on" },
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(optedOut.status, 200);
  assert.equal((await optedOut.json()).filterEnabled, true);
  assert.match(optedOut.headers.get("set-cookie") || "", /Max-Age=0/i, "Disabling must clear cookie");
  evidence.push({ check: "adult preference opt-in, opt-out, same-origin and default locked", result: "pass" });

  // /person/:id is now an intentionally supported TMDB detail route. Probe
  // an unlisted operation to test the proxy allowlist without calling TMDB.
  await assertApi("/api/tmdb/account/1", {}, 404, "TMDB arbitrary operation blocked");
  await assertApi("/api/tmdb/discover/movie?page=501", {}, 400, "TMDB out-of-range pagination rejected");
  await assertApi("/api/anilist", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation: "arbitrary", variables: {} }),
  }, 404, "AniList arbitrary GraphQL blocked");
  await assertApi("/api/anilist", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation: "browse", variables: { page: 1, isAdult: true } }),
  }, 403, "AniList explicit content unavailable while locked");
  await assertApi("/api/anilist", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://attacker.invalid" },
    body: JSON.stringify({ operation: "browse", variables: { page: 1 } }),
  }, 403, "AniList cross-origin POST rejected");
}

const movie = {
  id: 101, title: "Demo Movie", media_type: "movie",
  overview: "A test-only movie used to qualify the UI.",
  poster_path: "/rc-movie-poster.jpg", backdrop_path: null, adult: false,
  genre_ids: [12, 878], release_date: "2026-07-01", vote_average: 7.9,
};
const series = {
  id: 102, name: "Demo Series", media_type: "tv",
  overview: "A test-only series used to qualify the UI.",
  poster_path: null, backdrop_path: null, adult: false,
  genre_ids: [16, 35], first_air_date: "2025-02-03", vote_average: 8.1,
};
const anime = {
  id: 103, title: { romaji: "Demo Anime", english: "Demo Anime" },
  type: "ANIME", isAdult: false, tags: [], genres: ["Action"],
  coverImage: null, bannerImage: null, seasonYear: 2026,
  averageScore: 83, episodes: 12, format: "TV", description: "Test anime",
};
const pageInfo = { total: 1, currentPage: 1, lastPage: 1, hasNextPage: false };

async function installIsolatedCatalog(context) {
  await context.route("**/api/vivamax-ids", (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ complete: true, refreshedAt: Date.now(), ids: [991111] }),
  }));
  await context.route("**/api/tmdb/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    let payload = { results: [movie, series], total_pages: 1, page: 1 };
    let code = 200;
    if (path.includes("/991111")) {
      payload = { error: "Restricted by policy" };
      code = 404;
    } else if (path.includes("/trending/tv/") || path.includes("/discover/tv")) {
      payload = { results: [series], total_pages: 1, page: 1 };
    } else if (path.includes("/trending/movie/") || path.includes("/discover/movie")) {
      payload = { results: [movie], total_pages: 1, page: 1 };
    } else if (path.endsWith("/genre/movie/list") || path.endsWith("/genre/tv/list")) {
      payload = { genres: [{ id: 12, name: "Adventure" }, { id: 16, name: "Animation" }] };
    } else if (path.endsWith("/movie/101")) {
      payload = { ...movie, production_companies: [{ id: 9 }], release_dates: { results: [] } };
    } else if (path.endsWith("/tv/102")) {
      payload = { ...series, content_ratings: { results: [] } };
    }
    return route.fulfill({ status: code, contentType: "application/json", body: JSON.stringify(payload) });
  });
  await context.route("**/api/anilist", (route) => {
    const { operation, variables } = route.request().postDataJSON() || {};
    if (operation === "detail" && variables?.id === 80801) {
      return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Restricted" }) });
    }
    if (operation === "eligibility") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { ids: [] } }) });
    }
    if (operation === "detail") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { Media: anime } }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: { Page: { media: [anime], pageInfo } } }) });
  });
}

async function assertNoHorizontalOverflow(page, description) {
  const geometry = await page.evaluate(() => ({
    width: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  assert.ok(geometry.documentWidth <= geometry.width + 3,
    description + " has horizontal overflow: " + JSON.stringify(geometry));
  evidence.push({ check: description + " layout", result: "pass", ...geometry });
}

async function runBrowserChecks() {
  const browser = await chromium.launch({
    headless: true, executablePath: chrome,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-first-run"],
  });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      ignoreHTTPSErrors: false,
      serviceWorkers: "block", // Deterministic image/catalog interception; SW has dedicated tests.
    });
    await installIsolatedCatalog(ctx);
    let posterFailures = 0;
    let failNextPoster = false;
    await ctx.route("https://image.tmdb.org/t/p/**/rc-movie-poster.jpg", async (route) => {
      if (failNextPoster) {
        failNextPoster = false;
        posterFailures++;
        await route.abort("failed");
        return;
      }
      await route.fulfill({ status: 200, contentType: "image/svg+xml", headers: { "Cache-Control": "no-store" }, body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="60"><rect width="40" height="60" fill="#2563eb"/></svg>' });
    });
    const page = await ctx.newPage();
    page.on("pageerror", (error) => warningEvents.push({ type: "pageerror", message: error.message }));
    page.setDefaultTimeout(15_000);

    await page.goto(new URL("/login", base).href, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Welcome Back" }).waitFor();
    await page.locator("#login-email").waitFor();
    await page.locator("#login-password").waitFor();
    await assertNoHorizontalOverflow(page, "mobile Login");
    await page.screenshot({ path: artifacts + "/login-mobile.png", fullPage: true, animations: "disabled" });

    // This local-only demo creates a synthetic profile, never a Firebase user.
    await page.getByRole("button", { name: "Quick Local Demo Sign-In" }).click();
    await page.waitForURL(/\/profiles(?:\?|$)/, { timeout: 20_000 });
    await page.getByRole("heading", { name: "Who is watching?" }).waitFor();
    await page.getByRole("button", { name: "Add Profile" }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByPlaceholder("e.g. Action Hero").fill("RC Smoke");
    await page.getByRole("button", { name: "Launch Portal" }).click();
    await page.getByRole("button", { name: /Select profile RC Smoke/ }).waitFor();
    await page.getByRole("button", { name: /Select profile RC Smoke/ }).click();
    await page.waitForURL(/\/home(?:\?|$)/, { timeout: 20_000 });
    await page.locator(".app-page-shell").waitFor();
    // Some valid TMDB titles have no backdrop image; Home must still show the
    // text-and-gradient hero instead of dropping the entire featured section.
    await page.locator('.zoku-hero').waitFor({ timeout: 20_000 });
    await page.locator('.zoku-hero').getByRole("heading", { name: "Demo Movie" }).waitFor({ timeout: 20_000 });
    evidence.push({ check: "local-only sign-in and profile selection", result: "pass" });
    evidence.push({ check: "featured hero survives missing TMDB backdrop", result: "pass" });

    const viewports = [
      { width: 390, height: 844, label: "phone" },
      { width: 768, height: 1024, label: "tablet" },
      { width: 1024, height: 768, label: "landscape" },
      { width: 1440, height: 900, label: "desktop" },
    ];
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(450);
      await assertNoHorizontalOverflow(page, "Home " + viewport.label);
      await page.screenshot({
        path: artifacts + "/home-" + viewport.label + ".png",
        fullPage: true, animations: "disabled",
      });
      const interactive = await page.locator('[data-tv-focusable="true"]:visible').count();
      assert.ok(interactive > 0, "Home " + viewport.label + " has no visible TV-focusable controls");
      evidence.push({ check: "Home " + viewport.label + " focusable controls", result: "pass", count: interactive });
    }

    // Navigate through an actual settings change and return to Home with a
    // transient poster failure. Artwork must recover without a full refresh.
    await page.goto(new URL("/settings?section=theme", base).href, { waitUntil: "domcontentloaded" });
    await page.getByTestId("settings-perf-mode-60fps").click();
    failNextPoster = true;
    await page.getByRole("button", { name: "Back to Home" }).click();
    await page.waitForURL(/\\/home(?:\\?|$)/);
    await page.waitForFunction(() => [...document.querySelectorAll(".cinematic-poster-card img")].some((img) => img instanceof HTMLImageElement && img.src.includes("rc-movie-poster.jpg") && img.complete && img.naturalWidth > 0));
    assert.equal(posterFailures, 1, "Artwork regression must exercise a transient request failure");
    evidence.push({ check: "Settings to Home poster recovery", result: "pass" });

    // Regression: Settings nav must wrap into a proper grid without horizontal
    // scrollbars or clipped tabs at mobile and desktop sizes.
    await page.goto(new URL("/settings?section=profiles", base).href, { waitUntil: "domcontentloaded" });
    await page.getByTestId("settings-adult-content-filter").waitFor({ timeout: 20_000 });
    for (const viewport of [{ width: 390, height: 844 }, { width: 1150, height: 864 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => document.documentElement.setAttribute("data-zoku-layout", "cinematic"));
      const nav = page.locator(".zoku-settings-nav");
      const navInfo = await nav.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const tabs = [...element.querySelectorAll("button")].map((button) => button.getBoundingClientRect());
        return {
          display: getComputedStyle(element).display,
          scrollWidth: element.scrollWidth,
          width: element.clientWidth,
          allVisible: tabs.every((rect) => rect.left >= bounds.left - 2 && rect.right <= bounds.right + 2),
          count: tabs.length,
        };
      });
      assert.equal(navInfo.display, viewport.width >= 1024 ? "flex" : "grid", "Settings navigation must adapt to the viewport");
      assert.equal(navInfo.count, 9, "All nine settings sections must remain accessible");
      assert.ok(navInfo.scrollWidth <= navInfo.width + 2 && navInfo.allVisible,
        "Settings nav must not require horizontal scrolling: " + JSON.stringify(navInfo));
      await assertNoHorizontalOverflow(page, "Settings " + viewport.width);
      await page.screenshot({
        path: artifacts + "/settings-profiles-" + viewport.width + ".png",
        animations: "disabled", fullPage: true,
      });
    }

    // Home genre preferences must be saved and survive a full page reload.
    // The local demo uses the same session-store update path as Firebase mode.
    await page.goto(new URL("/settings?section=genre-rails", base).href, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Home Genre Channels" }).waitFor();
    await page.getByRole("button", { name: "Reset Default" }).click();
    const selectionCounter = page.getByTestId("genre-selected-count");
    await page.waitForFunction(() =>
      document.querySelector('[data-testid="genre-selected-count"]')?.textContent?.includes("2 / 2")
    );
    const genreSave = page.getByTestId("save-genre-rails");
    await genreSave.click();
    await page.waitForFunction(() => document.querySelector('[data-testid="save-genre-rails"]')?.disabled === true);
    assert.equal(await page.getByTestId("genre-save-error").count(), 0);
    await page.reload({ waitUntil: "domcontentloaded" });
    await selectionCounter.waitFor({ timeout: 20_000 });
    await page.waitForFunction(() =>
      document.querySelector('[data-testid="genre-selected-count"]')?.textContent?.includes("2 / 2")
    );
    assert.match(await selectionCounter.innerText(), /2\s*\/\s*2/, "Genre choices should persist after reloading Settings");
    assert.equal(await page.getByTestId("save-genre-rails").isDisabled(), true,
      "Previously saved choices must not remain dirty after reload");
    evidence.push({ check: "Home genre preference local-demo save, readback, reload, and stable state (not authenticated Firestore)", result: "pass" });

    // Restore the Profiles tab after testing genre preferences.
    await page.goto(new URL("/settings?section=profiles", base).href, { waitUntil: "domcontentloaded" });
    await page.getByTestId("settings-adult-content-filter").waitFor();

    // Verify actual same-origin preference and the UI's password-free switch.
    const toggle = page.getByTestId("adult-content-switch");
    await toggle.waitFor();
    assert.equal(await toggle.getAttribute("aria-checked"), "false", "New browser starts filtered");
    assert.equal(await page.locator("#adult-filter-password").count(), 0, "Password input must be removed");
    await toggle.click();
    await page.waitForFunction(() =>
      document.querySelector('[data-testid="adult-content-switch"]')?.getAttribute("aria-checked") === "true"
    );
    const optedOnState = await page.evaluate(async () => (await fetch("/api/adult-content", { cache: "no-store" })).json());
    assert.equal(optedOnState.filterEnabled, false, "Enabling toggle must persist to server preference");
    await toggle.click();
    await page.waitForFunction(() =>
      document.querySelector('[data-testid="adult-content-switch"]')?.getAttribute("aria-checked") === "false"
    );
    const optedOffState = await page.evaluate(async () => (await fetch("/api/adult-content", { cache: "no-store" })).json());
    assert.equal(optedOffState.filterEnabled, true, "Disabling toggle must restore server-side filtering");
    evidence.push({ check: "Settings nav grid and adult preference round-trip", result: "pass" });

    // Regression: Original Language must not snap to the selected first item
    // on every ArrowDown / TV remote navigation event.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(new URL("/discover?type=movie", base).href, { waitUntil: "domcontentloaded" });
    const languageTrigger = page.getByTestId("discover-language-select");
    await languageTrigger.waitFor();
    await languageTrigger.click();
    const languageList = page.getByRole("listbox", { name: "Original Language" });
    await languageList.waitFor();
    const firstHighlight = languageList.locator('[data-highlighted="true"]');
    assert.match(await firstHighlight.innerText(), /All Languages/, "menu must begin at selected language");
    for (let index = 0; index < 12; index++) {
      await page.keyboard.press("ArrowDown");
    }
    await languageList.locator('[data-highlighted="true"]', { hasText: "Arabic" }).waitFor();
    assert.match(await firstHighlight.innerText(), /Arabic/, "keyboard navigation must advance beyond initially visible languages");
    await page.waitForFunction(() => {
      const menu = document.querySelector('[role="listbox"][aria-label="Original Language"]');
      return menu instanceof HTMLElement && menu.scrollTop > 0;
    });
    const scrolled = await languageList.evaluate((element) => element.scrollTop);
    assert.ok(scrolled > 0, "language list must scroll to keep the highlighted item visible");
    await page.keyboard.press("ArrowDown");
    await languageList.locator('[data-highlighted="true"]', { hasText: "Thai" }).waitFor();
    assert.match(await firstHighlight.innerText(), /Thai/, "ArrowDown must not reset navigation to the first item");
    const nextScroll = await languageList.evaluate((element) => element.scrollTop);
    assert.ok(nextScroll >= scrolled - 1, "moving downward must not jump back to the top");
    await page.keyboard.press("ArrowUp");
    await languageList.locator('[data-highlighted="true"]', { hasText: "Arabic" }).waitFor();
    assert.match(await firstHighlight.innerText(), /Arabic/, "ArrowUp must preserve the scrolled navigation position");
    await page.screenshot({ path: artifacts + "/discover-language-keyboard-scroll.png", animations: "disabled" });
    await page.keyboard.press("Enter");
    await page.waitForURL(/language=ar(?:&|$)/, { timeout: 15_000 });
    evidence.push({ check: "Original Language D-pad scroll and selection stability", result: "pass", scrollTop: nextScroll });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(new URL("/search?q=Demo", base).href, { waitUntil: "domcontentloaded" });
    await page.getByText("Demo Movie", { exact: true }).first().waitFor({ timeout: 20_000 });
    await page.getByRole("button", { name: "Movies", exact: true }).click();
    await page.getByText("Demo Movie", { exact: true }).first().waitFor();
    await page.getByRole("button", { name: "Series", exact: true }).click();
    await page.getByText("Demo Series", { exact: true }).first().waitFor();
    await page.getByRole("button", { name: "Anime", exact: true }).click();
    await page.getByText("Demo Anime", { exact: true }).first().waitFor();
    assert.equal(await page.getByRole("button", { name: "Load More Results" }).count(), 0,
      "One-page TMDB and AniList catalogs must not show infinite Load More");
    evidence.push({ check: "Search stops after authoritative provider last pages", result: "pass" });
    await assertNoHorizontalOverflow(page, "Search mobile media tabs");
    await page.screenshot({ path: artifacts + "/search-mobile.png", fullPage: true, animations: "disabled" });
    evidence.push({ check: "search All/Movies/Series/Anime tab switching", result: "pass" });

    await page.goto(new URL("/watch/movie/991111", base).href, { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="watch-title-eligibility-gate"]').waitFor();
    assert.equal(await page.locator("iframe").count(), 0, "Rejected movie mounted a third-party frame");
    evidence.push({ check: "movie restricted route does not mount player", result: "pass" });

    await page.goto(new URL("/watch/anime/80801/1/1", base).href, { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="anime-adult-content-gate"]').waitFor();
    assert.equal(await page.locator("iframe").count(), 0, "Rejected anime mounted a third-party frame");
    evidence.push({ check: "anime restricted route does not mount player", result: "pass" });

    if (warningEvents.length) {
      throw new Error("Unhandled browser errors: " + warningEvents.map(x => x.message).slice(0, 5).join(" | "));
    }
    await ctx.close();
  } finally {
    await browser.close();
  }
}

try {
  await checkPolicyGuards();
  await runBrowserChecks();
  console.log("PASS — release-candidate browser, routing and API safety checks");
} catch (error) {
  failures.push(error instanceof Error ? (error.stack || error.message) : String(error));
  console.error("FAIL — " + failures[0]);
  process.exitCode = 1;
} finally {
  await writeFile(artifacts + "/report.json", JSON.stringify({
    release: "Zoku RC browser qualification",
    target: base.origin,
    checks: evidence,
    errors: failures,
    pageErrors: warningEvents,
  }, null, 2));
}
