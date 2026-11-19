"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
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

interface FloatingMenuParentContextValue {
  ancestorIds: string[];
  depth: number;
}

const FloatingMenuParentContext = createContext<FloatingMenuParentContextValue>({
  ancestorIds: [],
  depth: 0,
});

interface FloatingMenuOpenDetail {
  id: string;
  ancestorIds: string[];
}

// Tracks open FloatingMenus in open order so Escape closes the deepest/most recent menu first
const openMenuStack: string[] = [];

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
  restoreFocusOnEscape?: boolean;
  className?: string;
  menuRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

/**
 * Portal-rendered viewport-aware dropdown/popover menu.
 * - Renders into document.body with position: fixed so opening a dropdown NEVER
 *   grows parent or document height, spawns secondary scrollbars, or gets clipped by ancestors.
 * - Automatically flips between bottom and top and clamps horizontally/vertically inside the viewport.
 * - Supports nested menus (e.g. a sort dropdown inside a filter popover) without closing parents
 *   or expanding parent containers.
 * - Auto-dismisses when its anchor scrolls completely off-screen, when a sibling
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
  restoreFocusOnEscape = true,
  className = "",
  menuRef: externalMenuRef,
  children,
}: FloatingMenuProps) {
  const instanceId = useId();
  const parentCtx = useContext(FloatingMenuParentContext);
  const ancestorIds = parentCtx.ancestorIds;
  const depth = parentCtx.depth;
  const childCtxValue = useMemo<FloatingMenuParentContextValue>(
    () => ({
      ancestorIds: [...ancestorIds, instanceId],
      depth: depth + 1,
    }),
    [ancestorIds, instanceId, depth]
  );

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

  // Maintain LIFO open stack and sibling-only single-active coordination
  useEffect(() => {
    if (!open || !mounted) return;

    const existingIdx = openMenuStack.indexOf(instanceId);
    if (existingIdx >= 0) openMenuStack.splice(existingIdx, 1);
    openMenuStack.push(instanceId);

    const detail: FloatingMenuOpenDetail = {
      id: instanceId,
      ancestorIds,
    };
    window.dispatchEvent(new CustomEvent(FLOATING_MENU_OPEN_EVENT, { detail }));

    const handleOtherMenuOpen = (event: Event) => {
      const customEvent = event as CustomEvent<FloatingMenuOpenDetail>;
      const opened = customEvent.detail;
      if (!opened || opened.id === instanceId) return;
      // Keep ancestor menus open when a child dropdown opens inside them
      if (opened.ancestorIds.includes(instanceId)) return;
      onCloseRef.current();
    };

    window.addEventListener(FLOATING_MENU_OPEN_EVENT, handleOtherMenuOpen);
    return () => {
      const idx = openMenuStack.indexOf(instanceId);
      if (idx >= 0) openMenuStack.splice(idx, 1);
      window.removeEventListener(FLOATING_MENU_OPEN_EVENT, handleOtherMenuOpen);
    };
  }, [open, mounted, instanceId, ancestorIds]);

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
      // Ignore scrolling that originates inside this floating menu or any child floating menu
      if (event.type === "scroll" && event.target instanceof Node) {
        if (internalMenuRef.current?.contains(event.target)) return;
        const targetEl =
          event.target instanceof Element
            ? event.target
            : event.target.parentElement;
        const floatingHost = targetEl?.closest<HTMLElement>("[data-floating-menu='true']");
        if (floatingHost) {
          const ancestors = (floatingHost.dataset.floatingAncestors || "").split(" ");
          if (ancestors.includes(instanceId)) return;
        }
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
  }, [open, mounted, anchorRef, align, minWidth, maxWidth, preferredMaxHeight, preferTop, instanceId]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (anchorRef.current?.contains(target)) return;
      if (internalMenuRef.current?.contains(target)) return;

      // Do not dismiss parent floating menu when interacting with a nested child floating menu
      const targetEl =
        target instanceof Element ? target : target.parentElement;
      const floatingHost = targetEl?.closest<HTMLElement>("[data-floating-menu='true']");
      if (floatingHost) {
        const hostAncestors = (floatingHost.dataset.floatingAncestors || "").split(" ");
        if (hostAncestors.includes(instanceId)) return;
      }

      onCloseRef.current();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Close only the topmost open menu on Escape so nested menus unwind one layer at a time
        if (openMenuStack[openMenuStack.length - 1] !== instanceId) return;
        event.stopPropagation();
        onCloseRef.current();
        if (restoreFocusOnEscape) {
          anchorRef.current?.focus();
        }
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
  }, [open, anchorRef, role, instanceId, restoreFocusOnEscape]);

  if (!open || !mounted) return null;

  const zIndex = Math.min(88, FLOATING_MENU_Z_INDEX + depth);

  const style: CSSProperties = pos
    ? {
        position: "fixed",
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: `${pos.width}px`,
        maxHeight: `${pos.maxHeight}px`,
        transformOrigin: pos.transformOrigin,
        zIndex,
      }
    : {
        position: "fixed",
        top: "0px",
        left: "0px",
        width: `${minWidth}px`,
        maxHeight: `${preferredMaxHeight}px`,
        zIndex,
        visibility: "hidden",
        pointerEvents: "none",
      };

  return createPortal(
    <FloatingMenuParentContext.Provider value={childCtxValue}>
      <div
        ref={setRefs}
        id={id}
        role={role}
        aria-label={ariaLabel}
        data-floating-menu="true"
        data-floating-menu-id={instanceId}
        data-floating-ancestors={ancestorIds.join(" ")}
        data-placement={pos?.placement ?? "bottom"}
        style={style}
        className={`zoku-floating-menu overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-border-custom bg-surface text-on-surface shadow-2xl custom-scrollbar ${className}`.trim()}
      >
        {children}
      </div>
    </FloatingMenuParentContext.Provider>,
    document.body
  );
}
