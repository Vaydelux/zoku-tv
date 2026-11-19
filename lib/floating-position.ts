export type FloatingAlign = "left" | "right" | "stretch";
export type FloatingPlacement = "bottom" | "top";

export interface RectLike {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export interface ViewportLike {
  width: number;
  height: number;
}

export interface FloatingPositionOptions {
  align?: FloatingAlign;
  gap?: number;
  edgePadding?: number;
  minWidth?: number;
  maxWidth?: number;
  preferredMaxHeight?: number;
  /** Minimum height desired below before flipping upward */
  flipThreshold?: number;
  /** Prefer opening upward first (e.g. bottom dock controls) */
  preferTop?: boolean;
}

export interface FloatingPositionResult {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: FloatingPlacement;
  transformOrigin: string;
}

function sanitizeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Returns true when at least part of the anchor trigger is visible within the
 * current viewport and the element has non-zero layout dimensions.
 * Used to auto-dismiss floating portals when their trigger scrolls off-screen
 * or collapses/detaches from layout.
 */
export function isAnchorInViewport(
  trigger: RectLike,
  viewport: ViewportLike
): boolean {
  const vw = sanitizeNumber(viewport.width, 0);
  const vh = sanitizeNumber(viewport.height, 0);
  const width = sanitizeNumber(trigger.width, 0);
  const height = sanitizeNumber(trigger.height, 0);
  const top = sanitizeNumber(trigger.top, -1);
  const bottom = sanitizeNumber(trigger.bottom, -1);
  const left = sanitizeNumber(trigger.left, -1);
  const right = sanitizeNumber(trigger.right, -1);

  if (vw <= 0 || vh <= 0) return false;
  if (width <= 0 && height <= 0) return false;
  if (bottom <= 0 || top >= vh) return false;
  if (right <= 0 || left >= vw) return false;
  return true;
}

/**
 * Computes fixed-viewport coordinates for a floating dropdown/popover portal.
 * Guarantees:
 * - Zero document scrollHeight growth (fixed to viewport, never resizes page)
 * - Automatic flip between bottom and top when space below is constrained
 * - Strict horizontal clamping inside [edgePadding, viewport.width - edgePadding]
 * - Strict vertical maxHeight clamping so the menu never clips off-screen
 */
export function computeFloatingPosition(
  trigger: RectLike,
  viewport: ViewportLike,
  measuredMenuHeight = 280,
  options: FloatingPositionOptions = {}
): FloatingPositionResult {
  const {
    align = "left",
    gap = 6,
    edgePadding = 12,
    minWidth = 192,
    maxWidth = 320,
    preferredMaxHeight = 320,
    flipThreshold = 200,
    preferTop = false,
  } = options;

  const vw = Math.max(240, sanitizeNumber(viewport.width, 1024));
  const vh = Math.max(240, sanitizeNumber(viewport.height, 768));
  const safeGap = Math.max(0, sanitizeNumber(gap, 6));
  const safeEdgePadding = Math.max(0, sanitizeNumber(edgePadding, 12));
  const safeMinWidth = Math.max(120, sanitizeNumber(minWidth, 192));
  const safeMaxWidth = Math.max(safeMinWidth, sanitizeNumber(maxWidth, 320));
  const safePreferredMaxHeight = Math.max(120, sanitizeNumber(preferredMaxHeight, 320));
  const safeFlipThreshold = Math.max(80, sanitizeNumber(flipThreshold, 200));
  const safeMeasuredHeight = Math.max(44, sanitizeNumber(measuredMenuHeight, 280));

  const tTop = sanitizeNumber(trigger.top, safeEdgePadding);
  const tBottom = sanitizeNumber(trigger.bottom, tTop + 40);
  const tLeft = sanitizeNumber(trigger.left, safeEdgePadding);
  const tRight = sanitizeNumber(trigger.right, tLeft + 160);
  const tWidth = Math.max(0, sanitizeNumber(trigger.width, tRight - tLeft));

  const usableWidth = Math.max(160, vw - safeEdgePadding * 2);

  // Width calculation
  const rawWidth =
    align === "stretch"
      ? Math.max(tWidth, safeMinWidth)
      : Math.max(safeMinWidth, Math.min(safeMaxWidth, Math.max(tWidth, safeMinWidth)));
  const width = Math.min(usableWidth, Math.min(safeMaxWidth, rawWidth));

  // Horizontal alignment + strict clamping
  let left = align === "right" ? tRight - width : tLeft;
  if (left + width > vw - safeEdgePadding) {
    left = vw - safeEdgePadding - width;
  }
  if (left < safeEdgePadding) {
    left = safeEdgePadding;
  }

  // Vertical space above & below trigger
  const spaceBelow = Math.max(0, vh - tBottom - safeGap - safeEdgePadding);
  const spaceAbove = Math.max(0, tTop - safeGap - safeEdgePadding);
  const neededHeight = Math.min(safePreferredMaxHeight, Math.max(120, safeMeasuredHeight));

  let placement: FloatingPlacement = "bottom";
  if (preferTop) {
    placement =
      spaceAbove >= Math.min(neededHeight, safeFlipThreshold) || spaceAbove >= spaceBelow
        ? "top"
        : "bottom";
  } else {
    const fitsBelow = spaceBelow >= neededHeight || spaceBelow >= safeFlipThreshold;
    if (!fitsBelow && spaceAbove > spaceBelow) {
      placement = "top";
    }
  }

  const availableVertical = placement === "top" ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(120, Math.min(safePreferredMaxHeight, availableVertical));
  const effectiveHeight = Math.min(safeMeasuredHeight, maxHeight);

  let top =
    placement === "top"
      ? tTop - safeGap - effectiveHeight
      : tBottom + safeGap;

  // Final vertical clamp inside viewport edges
  if (top < safeEdgePadding) {
    top = safeEdgePadding;
  } else if (top + effectiveHeight > vh - safeEdgePadding) {
    top = Math.max(safeEdgePadding, vh - safeEdgePadding - effectiveHeight);
  }

  const originX = align === "right" ? "right" : "left";
  const originY = placement === "top" ? "bottom" : "top";

  return {
    top: Math.round(top),
    left: Math.round(left),
    width: Math.round(width),
    maxHeight: Math.round(maxHeight),
    placement,
    transformOrigin: `${originY} ${originX}`,
  };
}
