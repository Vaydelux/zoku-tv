"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  computeFloatingPosition,
  isAnchorInViewport,
  type FloatingAlign,
  type FloatingPositionResult,
} from "@/lib/floating-position";

const FLOATING_MENU_OPEN_EVENT = "zoku:floating-menu-open";
const FLOATING_MENU_Z_INDEX = 80;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface FloatingMenuProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  id?: string;
  role?: "listbox" | "menu" | "dialog";
  ariaLabel?: string;
  align?: FloatingAlign;
  minWidth?: number;
  maxWidth?: number;
  preferredMaxHeight?: number;
  preferTop?: boolean;
  className?: string;
  menuRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

/**
 * Portal-rendered fixed-position dropdown/popover menu.
 * - Renders into document.body with position: fixed so opening a dropdown NEVER
 *   grows document height, spawns secondary body scrollbars, or resizes the screen.
 * - Automatically flips upward when space below is tight (e.g. player server bar).
 * - Clamps cleanly inside mobile, tablet, desktop, and TV viewports with overscroll containment.
 * - Auto-dismisses when its anchor scrolls completely off-screen, when another
 *   FloatingMenu opens, or when CommandPalette (Ctrl/Cmd+K) is invoked.
 */
export function FloatingMenu({
  open,
  anchorRef,
  onClose,
  id,
  role = "listbox",
  ariaLabel,
  align = "left",
  minWidth = 200,
  maxWidth = 320,
  preferredMaxHeight = 320,
  preferTop = false,
  className = "",
  menuRef: externalMenuRef,
  children,
}: FloatingMenuProps) {
  const instanceId = useId();
  const internalMenuRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<FloatingPositionResult | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setRefs = (node: HTMLDivElement | null) => {
    internalMenuRef.current = node;
    if (externalMenuRef && "current" in externalMenuRef) {
      (externalMenuRef as { current: HTMLDivElement | null }).current = node;
    }
  };

  // Single-active menu coordination: opening one FloatingMenu closes any other open FloatingMenu
  useEffect(() => {
    if (!open || !mounted) return;

    window.dispatchEvent(
      new CustomEvent(FLOATING_MENU_OPEN_EVENT, { detail: instanceId })
    );

    const handleOtherMenuOpen = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail !== instanceId) {
        onCloseRef.current();
      }
    };

    window.addEventListener(FLOATING_MENU_OPEN_EVENT, handleOtherMenuOpen);
    return () => {
      window.removeEventListener(FLOATING_MENU_OPEN_EVENT, handleOtherMenuOpen);
    };
  }, [open, mounted, instanceId]);

  useIsomorphicLayoutEffect(() => {
    if (!open || !mounted) {
      setPos(null);
      return;
    }

    const updatePosition = (fromScroll = false) => {
      const anchor = anchorRef.current;
      if (!anchor || !anchor.isConnected) {
        onCloseRef.current();
        return;
      }

      const viewport = {
        width: document.documentElement.clientWidth || window.innerWidth,
        height: window.innerHeight,
      };
      const rect = anchor.getBoundingClientRect();

      if (fromScroll && !isAnchorInViewport(rect, viewport)) {
        onCloseRef.current();
        return;
      }

      const measuredHeight = internalMenuRef.current?.scrollHeight || 260;
      const next = computeFloatingPosition(rect, viewport, measuredHeight, {
        align,
        minWidth,
        maxWidth,
        preferredMaxHeight,
        preferTop,
      });
      setPos(next);
    };

    updatePosition(false);
    const rafId = window.requestAnimationFrame(() => updatePosition(false));

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && internalMenuRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updatePosition(false);
      });
      resizeObserver.observe(internalMenuRef.current);
    }

    const handleScrollOrResize = (event: Event) => {
      // Ignore scrolling that originates inside the floating menu itself
      if (
        event.type === "scroll" &&
        internalMenuRef.current &&
        event.target instanceof Node &&
        internalMenuRef.current.contains(event.target)
      ) {
        return;
      }
      updatePosition(event.type === "scroll");
    };

    window.addEventListener("resize", handleScrollOrResize, { passive: true });
    window.addEventListener("scroll", handleScrollOrResize, {
      passive: true,
      capture: true,
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [open, mounted, anchorRef, align, minWidth, maxWidth, preferredMaxHeight, preferTop]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (anchorRef.current?.contains(target)) return;
      if (internalMenuRef.current?.contains(target)) return;
      onCloseRef.current();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        anchorRef.current?.focus();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        onCloseRef.current();
        return;
      }
      if (event.key === "Tab" && role !== "dialog") {
        onCloseRef.current();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, anchorRef, role]);

  if (!open || !mounted) return null;

  const style: CSSProperties = pos
    ? {
        position: "fixed",
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: `${pos.width}px`,
        maxHeight: `${pos.maxHeight}px`,
        transformOrigin: pos.transformOrigin,
        zIndex: FLOATING_MENU_Z_INDEX,
      }
    : {
        position: "fixed",
        top: "-9999px",
        left: "-9999px",
        width: `${minWidth}px`,
        maxHeight: `${preferredMaxHeight}px`,
        zIndex: FLOATING_MENU_Z_INDEX,
        visibility: "hidden",
      };

  return createPortal(
    <div
      ref={setRefs}
      id={id}
      role={role}
      aria-label={ariaLabel}
      data-floating-menu="true"
      data-placement={pos?.placement ?? "bottom"}
      style={style}
      className={`zoku-floating-menu overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-border-custom bg-surface text-on-surface shadow-2xl custom-scrollbar ${className}`.trim()}
    >
      {children}
    </div>,
    document.body
  );
}
