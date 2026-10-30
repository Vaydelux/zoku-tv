export type DirectionalKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

export interface SpatialRect {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  railIndex?: number;
  itemIndex?: number;
}

export function isDirectionalKey(key: string): key is DirectionalKey {
  return (
    key === "ArrowUp" ||
    key === "ArrowDown" ||
    key === "ArrowLeft" ||
    key === "ArrowRight"
  );
}

/**
 * Computes the next focusable item index within a 1D horizontal rail or 2D grid.
 */
export function getNextGridFocusIndex(params: {
  currentIndex: number;
  totalItems: number;
  columns: number;
  key: DirectionalKey;
}): number {
  const { currentIndex, totalItems, columns, key } = params;
  if (totalItems <= 0) return -1;
  const cols = Math.max(1, columns);
  const clamped = Math.max(0, Math.min(totalItems - 1, currentIndex));

  switch (key) {
    case "ArrowRight":
      return Math.min(totalItems - 1, clamped + 1);
    case "ArrowLeft":
      return Math.max(0, clamped - 1);
    case "ArrowDown": {
      const next = clamped + cols;
      return next < totalItems ? next : clamped;
    }
    case "ArrowUp": {
      const prev = clamped - cols;
      return prev >= 0 ? prev : clamped;
    }
  }
}

/**
 * Given a list of spatial rectangles and a currently focused item ID,
 * selects the best candidate in the requested direction for 10-foot TV navigation.
 */
export function findNearestSpatialCandidate(
  current: SpatialRect,
  candidates: SpatialRect[],
  direction: DirectionalKey
): SpatialRect | null {
  const curCenterX = current.left + current.width / 2;
  const curCenterY = current.top + current.height / 2;

  let best: SpatialRect | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (candidate.id === current.id) continue;
    const candCenterX = candidate.left + candidate.width / 2;
    const candCenterY = candidate.top + candidate.height / 2;
    const dx = candCenterX - curCenterX;
    const dy = candCenterY - curCenterY;

    if (direction === "ArrowRight" && dx <= 4) continue;
    if (direction === "ArrowLeft" && dx >= -4) continue;
    if (direction === "ArrowDown" && dy <= 4) continue;
    if (direction === "ArrowUp" && dy >= -4) continue;

    // Weight primary axis distance + orthogonal penalty
    const isHorizontal = direction === "ArrowLeft" || direction === "ArrowRight";
    const primaryDist = isHorizontal ? Math.abs(dx) : Math.abs(dy);
    const orthoDist = isHorizontal ? Math.abs(dy) : Math.abs(dx);

    // If moving horizontally, strongly prefer items in the same rail/row
    const score = primaryDist + orthoDist * (isHorizontal ? 3.5 : 1.5);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

/**
 * Ensures a focused element inside a horizontally scrollable rail stays smoothly visible.
 */
export function ensureRailItemVisible(element: HTMLElement | null) {
  if (!element || typeof element.scrollIntoView !== "function") return;
  try {
    element.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  } catch {
    element.scrollIntoView();
  }
}

