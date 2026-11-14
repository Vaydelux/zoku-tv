#!/usr/bin/env node
/** Public-production baseline check; uses NO credentials or mocked APIs.
 * This checks the currently deployed production release, not the unmerged RC.
 * It never opens a streaming provider or a logged-in account.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const url = new URL(process.env.ZOKU_PUBLIC_BASE_URL || "https://zoku-tv.vercel.app");
if (url.origin !== "https://zoku-tv.vercel.app") {
  throw new Error("Public baseline checks are restricted to Zoku's known production origin");
}
const artifacts = process.env.RC_ARTIFACT_DIR || "artifacts/release-candidate";
await mkdir(artifacts, { recursive: true });
const report = { target: url.origin, kind: "public production baseline (not RC)", checks: [], errors: [] };
const check = (name) => report.checks.push(name);

async function api(path, options = {}) {
  const response = await fetch(new URL(path, url.origin), {
    signal: AbortSignal.timeout(15000), redirect: "manual", ...options,
  });
  return response;
}

try {
  const status = await api("/api/adult-content");
  assert.equal(status.status, 200, "Live adult policy endpoint unavailable");
  const policy = await status.json();
  assert.equal(policy.filterEnabled, true, "Live site must start adult-locked for unauthenticated visitors");
  check("adult policy defaults to locked");

  const unsupported = await api("/api/tmdb/person/1");
  assert.equal(unsupported.status, 404, "TMDB arbitrary endpoint must reject");
  check("TMDB unsupported endpoint rejected");

  const rejected = await api("/api/anilist", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation: "arbitrary", variables: {} }),
  });
  assert.equal(rejected.status, 404, "AniList arbitrary GraphQL operation must reject");
  check("AniList unsupported endpoint rejected");

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    headless: true,
  });
  try {
    for (const [width, height, name] of [
      [390, 844, "mobile"],
      [1440, 900, "desktop"],
    ]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      const response = await page.goto(new URL("/login", url.origin).href, { waitUntil: "domcontentloaded" });
      assert.equal(response?.status(), 200, "Live login page failed HTTP");
      await page.getByRole("heading", { name: "Welcome Back" }).waitFor();
      const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(geometry.scroll <= geometry.width + 3, "Live login overflow: " + JSON.stringify(geometry));
      assert.equal(pageErrors.length, 0, "Unhandled public-login browser exception: " + pageErrors.join(" | "));
      await page.screenshot({ path: artifacts + "/production-login-" + name + ".png", fullPage: true, animations: "disabled" });
      check("public Login " + name + " Chromium render and viewport");
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log("PASS — live public production baseline checks");
} catch (error) {
  const message = error instanceof Error ? (error.stack || error.message) : String(error);
  report.errors.push(message);
  console.error("FAIL — " + message);
  process.exitCode = 1;
} finally {
  await writeFile(artifacts + "/production-baseline-report.json", JSON.stringify(report, null, 2));
}
