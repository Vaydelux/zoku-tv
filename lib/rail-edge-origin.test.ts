import assert from "node:assert/strict";
import test from "node:test";
import { computeCardTransformOrigin } from "./rail-edge-origin";

const container = { left: 0, right: 1200, width: 1200 };

test("anchors left-edge rail cards to left center so expansion grows rightward", () => {
  const origin = computeCardTransformOrigin(
    { left: 24, right: 204, width: 180 },
    container
  );
  assert.equal(origin, "left center");
});

test("anchors right-edge rail cards to right center so expansion grows leftward", () => {
  const origin = computeCardTransformOrigin(
    { left: 990, right: 1170, width: 180 },
    container
  );
  assert.equal(origin, "right center");
});

test("keeps middle rail cards centered for symmetric lift", () => {
  const origin = computeCardTransformOrigin(
    { left: 480, right: 660, width: 180 },
    container
  );
  assert.equal(origin, "center center");
});

test("handles narrow containers gracefully by anchoring toward the closer edge", () => {
  const narrow = { left: 0, right: 240, width: 240 };
  assert.equal(
    computeCardTransformOrigin({ left: 10, right: 210, width: 200 }, narrow),
    "left center"
  );
  assert.equal(
    computeCardTransformOrigin({ left: 32, right: 232, width: 200 }, narrow),
    "right center"
  );
});
