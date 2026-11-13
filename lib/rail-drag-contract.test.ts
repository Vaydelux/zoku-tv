import assert from "node:assert/strict";
import test from "node:test";
import { canBeginRailDrag } from "./rail-drag-contract";

function elementWithClasses(...classNames: string[]) {
  const classSet = new Set(classNames);
  return { classList: { contains(name: string) { return classSet.has(name); } } };
}

test("poster-first media artwork remains draggable with a mouse", () => {
  assert.equal(canBeginRailDrag(null), true);
  assert.equal(canBeginRailDrag(elementWithClasses("cinematic-poster-open")), true);
  assert.equal(canBeginRailDrag(elementWithClasses("cinematic-poster-open", "focus-visible:outline")), true);
});

test("secondary actions and rail navigation never hijack mouse click as drag", () => {
  assert.equal(canBeginRailDrag(elementWithClasses("cinematic-poster-action")), false);
  assert.equal(canBeginRailDrag(elementWithClasses("rail-nav-btn")), false);
  assert.equal(canBeginRailDrag(elementWithClasses("zoku-mobile-tab")), false);
  assert.equal(canBeginRailDrag(elementWithClasses("ordinary-button")), false);
});
