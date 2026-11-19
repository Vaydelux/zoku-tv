import test from "node:test";
import assert from "node:assert/strict";
import { computeFloatingPosition, isAnchorInViewport } from "./floating-position";

test("opens below trigger with left alignment when ample space exists", () => {
  const result = computeFloatingPosition(
    { top: 100, bottom: 140, left: 48, right: 208, width: 160, height: 40 },
    { width: 1440, height: 900 },
    260,
    { align: "left", minWidth: 240, maxWidth: 300, preferredMaxHeight: 340 }
  );

  assert.equal(result.placement, "bottom");
  assert.equal(result.top, 146); // bottom (140) + gap (6)
  assert.equal(result.left, 48);
  assert.equal(result.width, 240);
  assert.equal(result.maxHeight, 340);
  assert.equal(result.transformOrigin, "top left");
});

test("flips upward automatically when trigger sits near bottom of viewport (watch server bar)", () => {
  const result = computeFloatingPosition(
    { top: 780, bottom: 820, left: 48, right: 210, width: 162, height: 40 },
    { width: 1440, height: 900 },
    320,
    { align: "left", minWidth: 240, maxWidth: 300, preferredMaxHeight: 340 }
  );

  assert.equal(result.placement, "top");
  assert.equal(result.top, 780 - 6 - 320); // 454
  assert.ok(result.top >= 12);
  assert.equal(result.transformOrigin, "bottom left");
});

test("clamps horizontally inside 390px mobile viewport without overflowing right edge", () => {
  const result = computeFloatingPosition(
    { top: 72, bottom: 112, left: 320, right: 374, width: 54, height: 40 },
    { width: 390, height: 844 },
    260,
    { align: "left", minWidth: 260, maxWidth: 300, edgePadding: 12 }
  );

  assert.ok(result.left >= 12);
  assert.ok(result.left + result.width <= 390 - 12);
});

test("aligns right-anchored popovers and clamps left edge on narrow screens", () => {
  const result = computeFloatingPosition(
    { top: 20, bottom: 60, left: 10, right: 70, width: 60, height: 40 },
    { width: 390, height: 844 },
    220,
    { align: "right", minWidth: 280, maxWidth: 320, edgePadding: 12 }
  );

  assert.equal(result.left, 12);
  assert.ok(result.left + result.width <= 390 - 12);
  assert.equal(result.transformOrigin, "top right");
});

test("stretch alignment matches trigger width up to maxWidth", () => {
  const result = computeFloatingPosition(
    { top: 200, bottom: 244, left: 20, right: 300, width: 280, height: 44 },
    { width: 1280, height: 800 },
    200,
    { align: "stretch", minWidth: 180, maxWidth: 320 }
  );

  assert.equal(result.width, 280);
  assert.equal(result.left, 20);
  assert.equal(result.placement, "bottom");
});

test("caps maxHeight to available vertical space so menu never clips off-screen", () => {
  const result = computeFloatingPosition(
    { top: 180, bottom: 220, left: 20, right: 200, width: 180, height: 40 },
    { width: 390, height: 420 },
    340,
    { align: "left", preferredMaxHeight: 340, edgePadding: 12, gap: 6 }
  );

  assert.equal(result.placement, "bottom");
  assert.equal(result.maxHeight, 420 - 220 - 6 - 12); // 182
  assert.ok(result.top + result.maxHeight <= 420 - 12);
});

test("isAnchorInViewport detects visible, partially visible, off-screen, and collapsed anchors", () => {
  const viewport = { width: 1440, height: 900 };

  assert.equal(
    isAnchorInViewport(
      { top: 120, bottom: 160, left: 40, right: 200, width: 160, height: 40 },
      viewport
    ),
    true
  );

  // Partially visible at top edge
  assert.equal(
    isAnchorInViewport(
      { top: -20, bottom: 20, left: 40, right: 200, width: 160, height: 40 },
      viewport
    ),
    true
  );

  // Scrolled completely above viewport
  assert.equal(
    isAnchorInViewport(
      { top: -60, bottom: -10, left: 40, right: 200, width: 160, height: 50 },
      viewport
    ),
    false
  );

  // Scrolled completely below viewport
  assert.equal(
    isAnchorInViewport(
      { top: 905, bottom: 945, left: 40, right: 200, width: 160, height: 40 },
      viewport
    ),
    false
  );

  // Scrolled off-screen to the right
  assert.equal(
    isAnchorInViewport(
      { top: 120, bottom: 160, left: 1460, right: 1620, width: 160, height: 40 },
      viewport
    ),
    false
  );

  // Detached / display:none 0x0 rect
  assert.equal(
    isAnchorInViewport(
      { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 },
      viewport
    ),
    false
  );
});

test("handles degenerate or NaN inputs gracefully without returning NaN coordinates", () => {
  const result = computeFloatingPosition(
    { top: Number.NaN, bottom: Number.NaN, left: Number.NaN, right: Number.NaN, width: -10, height: 0 },
    { width: Number.NaN, height: Number.NaN },
    Number.NaN
  );

  assert.equal(Number.isFinite(result.top), true);
  assert.equal(Number.isFinite(result.left), true);
  assert.equal(Number.isFinite(result.width), true);
  assert.equal(Number.isFinite(result.maxHeight), true);
  assert.ok(result.width >= 120);
  assert.ok(result.maxHeight >= 120);
});

test("flips watch player server dropdown upward when below space is cramped (< menu height) and above has ample room", () => {
  const result = computeFloatingPosition(
    { top: 620, bottom: 660, left: 64, right: 224, width: 160, height: 40 },
    { width: 1440, height: 900 },
    320,
    { align: "left", minWidth: 240, maxWidth: 300, preferredMaxHeight: 340 }
  );

  assert.equal(result.placement, "top");
  assert.equal(result.maxHeight, 340);
  assert.equal(result.top, 620 - 6 - 320); // 294
  assert.ok(result.top >= 12);
});
