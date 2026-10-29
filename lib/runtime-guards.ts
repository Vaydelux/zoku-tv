/**
 * Pure runtime guard utilities to prevent browser extension conflicts
 * (such as getter-only `window.fetch` overrides from Chrome extensions)
 * from throwing uncaught TypeErrors in the host window.
 */

export function normalizeFetchPropertyDescriptor(
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  if (!descriptor || typeof descriptor !== "object") {
    return descriptor;
  }

  // If a script defines `fetch` as an accessor with `get` but no `set`,
  // provide a setter so subsequent `window.fetch = ...` assignments do not throw
  // `TypeError: Cannot set property fetch of #<Window> which has only a getter`.
  if (typeof descriptor.get === "function" && typeof descriptor.set !== "function") {
    let currentGetter = descriptor.get;
    return {
      configurable: true,
      enumerable: descriptor.enumerable ?? true,
      get() {
        return currentGetter.call(this);
      },
      set(nextValue: unknown) {
        if (typeof nextValue === "function") {
          currentGetter = () => nextValue;
        }
      },
    };
  }

  // If a script defines `fetch` as a non-writable data descriptor, keep it writable
  if ("value" in descriptor && descriptor.writable === false) {
    return {
      ...descriptor,
      configurable: true,
      writable: true,
    };
  }

  return {
    ...descriptor,
    configurable: true,
  };
}

export function shouldIgnoreExtensionFetchError(input: {
  message?: string | null;
  filename?: string | null;
  stack?: string | null;
}): boolean {
  const msg = String(input.message ?? "");
  const file = String(input.filename ?? "");
  const stack = String(input.stack ?? "");

  if (msg.includes("Cannot set property fetch")) {
    return true;
  }

  if (
    file.startsWith("chrome-extension://") ||
    file.startsWith("moz-extension://") ||
    stack.includes("chrome-extension://") ||
    stack.includes("moz-extension://")
  ) {
    return true;
  }

  return false;
}

export function installWindowFetchGuard(targetWindow: any): void {
  if (!targetWindow || targetWindow.__zokuFetchGuardInstalled) return;
  try {
    targetWindow.__zokuFetchGuardInstalled = true;

    const origDefineProperty = Object.defineProperty;
    const ensureMutableFetchOn = (obj: any) => {
      if (!obj) return;
      try {
        const desc = Object.getOwnPropertyDescriptor(obj, "fetch");
        if (desc && desc.configurable !== false) {
          const normalized = normalizeFetchPropertyDescriptor(desc);
          origDefineProperty.call(Object, obj, "fetch", normalized);
        }
      } catch {
        // Ignore non-configurable descriptor errors
      }
    };

    ensureMutableFetchOn(targetWindow);
    if (targetWindow.Window && targetWindow.Window.prototype) {
      ensureMutableFetchOn(targetWindow.Window.prototype);
    }

    // Wrap Object.defineProperty so any extension defining `fetch` with only a getter
    // automatically receives a mutable setter as well.
    Object.defineProperty = function (
      target: any,
      property: PropertyKey,
      attributes: PropertyDescriptor
    ) {
      if (
        property === "fetch" &&
        (target === targetWindow ||
          (targetWindow.Window && target === targetWindow.Window.prototype))
      ) {
        return origDefineProperty.call(
          Object,
          target,
          property,
          normalizeFetchPropertyDescriptor(attributes)
        );
      }
      return origDefineProperty.call(Object, target, property, attributes);
    } as typeof Object.defineProperty;
  } catch {
    // Ignore if environment restricts Object.defineProperty
  }
}

export const INLINE_FETCH_AND_EXTENSION_GUARD_SCRIPT = `(function(){
  try {
    if (window.__zokuFetchGuardInstalled) return;
    window.__zokuFetchGuardInstalled = true;

    var origDef = Object.defineProperty;
    function normalizeFetchDesc(desc) {
      if (!desc || typeof desc !== "object") return desc;
      if (typeof desc.get === "function" && typeof desc.set !== "function") {
        var currentGet = desc.get;
        return {
          configurable: true,
          enumerable: desc.enumerable !== false,
          get: function() { return currentGet.call(this); },
          set: function(v) {
            if (typeof v === "function") {
              currentGet = function() { return v; };
            }
          }
        };
      }
      if ("value" in desc && desc.writable === false) {
        return {
          configurable: true,
          enumerable: desc.enumerable !== false,
          writable: true,
          value: desc.value
        };
      }
      return desc;
    }

    function patchTarget(obj) {
      if (!obj) return;
      try {
        var d = Object.getOwnPropertyDescriptor(obj, "fetch");
        if (d && d.configurable !== false) {
          origDef.call(Object, obj, "fetch", normalizeFetchDesc(d));
        }
      } catch (e) {}
    }

    patchTarget(window);
    if (typeof Window !== "undefined" && Window.prototype) {
      patchTarget(Window.prototype);
    }

    if (typeof window.fetch === "function") {
      try {
        var currentFetch = window.fetch.bind(window);
        origDef.call(Object, window, "fetch", {
          configurable: true,
          enumerable: true,
          get: function() { return currentFetch; },
          set: function(v) { if (typeof v === "function") currentFetch = v; }
        });
      } catch (e) {}
    }

    Object.defineProperty = function(target, prop, desc) {
      if (prop === "fetch" && (target === window || (typeof Window !== "undefined" && target === Window.prototype))) {
        return origDef.call(Object, target, prop, normalizeFetchDesc(desc));
      }
      return origDef.call(Object, target, prop, desc);
    };

    window.addEventListener("error", function(ev) {
      var msg = (ev && ev.message) ? String(ev.message) : "";
      var file = (ev && ev.filename) ? String(ev.filename) : "";
      var stack = (ev && ev.error && ev.error.stack) ? String(ev.error.stack) : "";
      if (
        msg.indexOf("Cannot set property fetch") !== -1 ||
        file.indexOf("chrome-extension://") === 0 ||
        file.indexOf("moz-extension://") === 0 ||
        stack.indexOf("chrome-extension://") !== -1
      ) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        return false;
      }
    }, true);
  } catch (e) {}
})();`;
