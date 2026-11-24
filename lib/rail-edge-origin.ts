export type CardTransformOrigin = "left center" | "center center" | "right center";

export interface HorizontalRect {
  left: number;
  right: number;
  width: number;
}

/**
 * Computes an edge-aware CSS transform-origin for a card inside a horizontal
 * rail or viewport so hover expansion grows inward rather than clipping at
 * the left or right viewport boundaries.
 */
export function computeCardTransformOrigin(
  card: HorizontalRect,
  container: HorizontalRect,
  edgeThresholdPx = 56
): CardTransformOrigin {
  const distLeft = card.left - container.left;
  const distRight = container.right - card.right;

  if (distLeft <= edgeThresholdPx && distRight > edgeThresholdPx) {
    return "left center";
  }
  if (distRight <= edgeThresholdPx && distLeft > edgeThresholdPx) {
    return "right center";
  }
  if (distLeft <= edgeThresholdPx && distRight <= edgeThresholdPx) {
    return distLeft <= distRight ? "left center" : "right center";
  }
  return "center center";
}
