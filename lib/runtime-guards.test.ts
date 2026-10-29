import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeFetchPropertyDescriptor,
  shouldIgnoreExtensionFetchError,
  installWindowFetchGuard,
} from "./runtime-guards";

describe("runtime-guards", () => {
  it("normalizes a getter-only fetch descriptor so setting window.fetch never throws", () => {
    const fakeWindow: Record<string, unknown> = {};
    const origFetch = () => "original";
    const replacementFetch = () => "replacement";

    const normalized = normalizeFetchPropertyDescriptor({
      configurable: true,
      enumerable: true,
      get: () => origFetch,
    });

    Object.defineProperty(fakeWindow, "fetch", normalized);
    assert.equal((fakeWindow.fetch as () => string)(), "original");

    // Mutating fakeWindow.fetch directly should succeed without throwing TypeError
    assert.doesNotThrow(() => {
      fakeWindow.fetch = replacementFetch;
    });
    assert.equal((fakeWindow.fetch as () => string)(), "replacement");
  });

  it("intercepts Object.defineProperty on window.fetch when an extension defines only a getter", () => {
    const fakeWindow: any = {
      Window: { prototype: {} },
      fetch: () => "initial",
    };

    installWindowFetchGuard(fakeWindow);

    // Simulate a first extension defining a getter-only `fetch` property on fakeWindow
    Object.defineProperty(fakeWindow, "fetch", {
      configurable: true,
      get: () => () => "from-extension-1",
    });

    // Simulate a second extension (like executors/200.js) assigning `window.fetch = ...`
    assert.doesNotThrow(() => {
      fakeWindow.fetch = () => "from-extension-2";
    });
    assert.equal(fakeWindow.fetch(), "from-extension-2");
  });

  it("identifies chrome-extension fetch errors while preserving genuine application errors", () => {
    assert.equal(
      shouldIgnoreExtensionFetchError({
        message: "TypeError: Cannot set property fetch of #<Window> which has only a getter",
        filename: "chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js",
      }),
      true
    );

    assert.equal(
      shouldIgnoreExtensionFetchError({
        message: "ReferenceError: myUndefinedVar is not defined",
        filename: "http://localhost:3000/_next/static/chunks/app/home/page.js",
      }),
      false
    );
  });
});
