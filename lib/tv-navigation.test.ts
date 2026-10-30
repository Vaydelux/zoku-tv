import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isDirectionalKey,
  getNextGridFocusIndex,
  findNearestSpatialCandidate,
  type SpatialRect,
} from "./tv-navigation";

describe("TV Browser & Directional Navigation Logic (Phase 9)", () => {
  it("recognizes directional arrow keys accurately", () => {
    assert.equal(isDirectionalKey("ArrowUp"), true);
    assert.equal(isDirectionalKey("ArrowDown"), true);
    assert.equal(isDirectionalKey("ArrowLeft"), true);
    assert.equal(isDirectionalKey("ArrowRight"), true);
    assert.equal(isDirectionalKey("Enter"), false);
  });

  it("computes 2D grid focus movement across columns and rows", () => {
    // 8 items in a 4-column grid:
    // [0, 1, 2, 3]
    // [4, 5, 6, 7]
    assert.equal(
      getNextGridFocusIndex({ currentIndex: 0, totalItems: 8, columns: 4, key: "ArrowRight" }),
      1
    );
    assert.equal(
      getNextGridFocusIndex({ currentIndex: 0, totalItems: 8, columns: 4, key: "ArrowLeft" }),
      0
    );
    assert.equal(
      getNextGridFocusIndex({ currentIndex: 1, totalItems: 8, columns: 4, key: "ArrowDown" }),
      5
    );
    assert.equal(
      getNextGridFocusIndex({ currentIndex: 5, totalItems: 8, columns: 4, key: "ArrowUp" }),
      1
    );
    assert.equal(
      getNextGridFocusIndex({ currentIndex: 6, totalItems: 8, columns: 4, key: "ArrowDown" }),
      6
    );
  });

  it("finds nearest spatial candidate across horizontal rails and vertical stacks", () => {
    const rail1Card1: SpatialRect = { id: "r1-c1", left: 0, top: 100, width: 180, height: 270 };
    const rail1Card2: SpatialRect = { id: "r1-c2", left: 200, top: 100, width: 180, height: 270 };
    const rail2Card1: SpatialRect = { id: "r2-c1", left: 0, top: 420, width: 180, height: 270 };
    const rail2Card2: SpatialRect = { id: "r2-c2", left: 200, top: 420, width: 180, height: 270 };
    const all = [rail1Card1, rail1Card2, rail2Card1, rail2Card2];

    const rightHit = findNearestSpatialCandidate(rail1Card1, all, "ArrowRight");
    assert.equal(rightHit?.id, "r1-c2");

    const downHit = findNearestSpatialCandidate(rail1Card1, all, "ArrowDown");
    assert.equal(downHit?.id, "r2-c1");

    const upHit = findNearestSpatialCandidate(rail2Card2, all, "ArrowUp");
    assert.equal(upHit?.id, "r1-c2");
  });
});

