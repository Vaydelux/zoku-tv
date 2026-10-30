"use client";

import { useEffect, type RefObject } from "react";

/**
 * Ensures any floating dropdown/popover menu stays strictly inside the horizontal
 * viewport bounds ([padding, viewportWidth - padding]) across all screen sizes
 * (320px mobile up to 4K desktop), regardless of where the trigger is positioned.
 */
export function useDropdownViewportClamp(
  isOpen: boolean,
  menuRef: RefObject<HTMLElement | null>,
  padding = 12
) {
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const clampToViewport = () => {
      const el = menuRef.current;
      if (!el) return;

      // Reset horizontal offset before measuring natural CSS position
      el.style.translate = "0px 0px";

      const rect = el.getBoundingClientRect();
      const vw = document.documentElement.clientWidth || window.innerWidth;

      let dx = 0;
      if (rect.left < padding) {
        dx = padding - rect.left;
      } else if (rect.right > vw - padding) {
        dx = vw - padding - rect.right;
      }

      if (Math.abs(dx) >= 1) {
        el.style.translate = `${Math.round(dx)}px 0px`;
      }
    };

    clampToViewport();
    const rafId = window.requestAnimationFrame(clampToViewport);

    window.addEventListener("resize", clampToViewport);
    window.addEventListener("scroll", clampToViewport, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", clampToViewport);
      window.removeEventListener("scroll", clampToViewport);
    };
  }, [isOpen, menuRef, padding]);
}

