import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getNavbarNetworkStatus } from "./network-status";

describe("getNavbarNetworkStatus", () => {
  it("returns subtle emerald online metadata when connected", () => {
    const status = getNavbarNetworkStatus(true);
    assert.equal(status.state, "online");
    assert.equal(status.isOffline, false);
    assert.equal(status.label, "Online");
    assert.ok(status.dotColorClass.includes("emerald"));
    assert.ok(status.badgeToneClass.includes("emerald"));
  });

  it("changes color to amber and informs user of offline-only state when connection is lost", () => {
    const status = getNavbarNetworkStatus(false);
    assert.equal(status.state, "offline");
    assert.equal(status.isOffline, true);
    assert.equal(status.label, "Offline-Only");
    assert.ok(status.dotColorClass.includes("amber"));
    assert.ok(status.badgeToneClass.includes("amber"));
    assert.ok(status.description.toLowerCase().includes("offline-only state"));
  });
});
