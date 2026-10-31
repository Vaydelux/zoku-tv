"use client";

import { useEffect } from "react";
import {
  ensureRailItemVisible,
  findNearestSpatialCandidate,
  isDirectionalKey,
  type SpatialRect,
} from "@/lib/tv-navigation";
import {
  readStoredPerfPreference,
  syncPerfModeToDocument,
} from "@/hooks/usePerfMode";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
  '[data-tv-focusable="true"]',
].join(", ");

function isElementVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") {
    return false;
  }
  const style = getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 4 && rect.height > 4;
}

function isEditableInput(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea") return true;
  if (tag === "input") {
    const type = (el as HTMLInputElement).type?.toLowerCase() || "text";
    return !["button", "submit", "reset", "checkbox", "radio"].includes(type);
  }
  return (el as HTMLElement).isContentEditable;
}

/**
 * Global Android TV Browser WebView, 32-Bit Performance Mode, & 10-Foot D-Pad / Virtual Mouse Controller.
 * Enables seamless directional arrow key navigation and virtual mouse compatibility on
 * Android TV, Fire TV, Downloader by AFTVnews, Shield, and TV Bro.
 */
export function TVSpatialNavProvider() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const html = document.documentElement;
    syncPerfModeToDocument(readStoredPerfPreference());

    const handlePointerMove = () => {
      if (!html.dataset.tvWebview && html.dataset.perfMode !== "60fps") {
        delete html.dataset.tvMode;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const active = document.activeElement as HTMLElement | null;

      // Support Android TV remote DPAD_CENTER (keyCode 23 / key "Select")
      if (
        (event.key === "Select" || event.keyCode === 23) &&
        active &&
        active !== document.body
      ) {
        html.dataset.tvMode = "true";
        event.preventDefault();
        active.click();
        return;
      }

      if (!isDirectionalKey(event.key)) return;

      // Do not hijack arrow keys inside text inputs or open dropdown listboxes
      if (isEditableInput(active)) {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") return;
      }
      if (
        active?.closest('[role="listbox"]') ||
        active?.getAttribute("aria-expanded") === "true"
      ) {
        return;
      }

      html.dataset.tvMode = "true";

      const allNodes = Array.from(
        document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(isElementVisible);

      if (allNodes.length === 0) return;

      // If no element is currently focused, focus the first visible interactive element
      if (!active || active === document.body || !allNodes.includes(active)) {
        event.preventDefault();
        const first = allNodes[0];
        first.focus({ preventScroll: true });
        ensureRailItemVisible(first);
        return;
      }

      const elementById = new Map<string, HTMLElement>();
      const rects: SpatialRect[] = allNodes.map((node, index) => {
        const id = `tv_node_${index}`;
        elementById.set(id, node);
        const r = node.getBoundingClientRect();
        return {
          id,
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
        };
      });

      const currentIndex = allNodes.indexOf(active);
      const currentRect = rects[currentIndex];
      if (!currentRect) return;

      const match = findNearestSpatialCandidate(currentRect, rects, event.key);
      if (!match) return;

      const nextEl = elementById.get(match.id);
      if (nextEl) {
        event.preventDefault();
        nextEl.focus({ preventScroll: true });
        ensureRailItemVisible(nextEl);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handlePointerMove);
    };
  }, []);

  return null;
}

