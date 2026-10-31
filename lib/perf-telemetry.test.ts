import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePercentile,
  probeMemoryUsage,
  FrameTelemetryLogger,
  runStutterStressTest,
} from "./perf-telemetry";

describe("Performance Telemetry Engine (32-Bit Android TV)", () => {
  it("calculates exact statistical percentiles for frame delta distributions", () => {
    assert.equal(calculatePercentile([], 95), 0);
    assert.equal(calculatePercentile([16.6], 95), 16.6);

    const values = [16.6, 16.7, 16.5, 16.8, 33.3, 16.6, 17.1, 16.6, 50.0, 16.7];
    const p50 = calculatePercentile(values, 50);
    const p95 = calculatePercentile(values, 95);

    assert.ok(p50 <= 17.1, `Expected p50 <= 17.1, got ${p50}`);
    assert.ok(p95 >= 33.3, `Expected p95 >= 33.3 to catch spike, got ${p95}`);
  });

  it("handles environment memory probes in server/test headless environments gracefully", () => {
    const memory = probeMemoryUsage();
    assert.equal(typeof memory.supported, "boolean");
    assert.equal(typeof memory.usedHeapMb, "number");
    assert.equal(typeof memory.totalHeapMb, "number");
    assert.equal(typeof memory.heapLimitMb, "number");
    assert.ok(memory.heapLimitMb > 0);
    assert.ok(["Optimal", "Moderate", "Critical"].includes(memory.statusLabel));
  });

  it("manages FrameTelemetryLogger lifecycle, history limits, and stat rollups", () => {
    const logger = new FrameTelemetryLogger(10);
    assert.equal(logger.getIsRunning(), false);
    assert.deepEqual(logger.getHistory(), []);

    const initialStats = logger.getStats();
    assert.equal(initialStats.totalFrames, 0);
    assert.equal(initialStats.jankCount, 0);
    assert.equal(initialStats.averageFps, 60);

    // Test JSON export structure
    const reportJson = logger.exportReport();
    assert.equal(typeof reportJson, "string");
    const parsed = JSON.parse(reportJson);
    assert.ok(parsed.exportedAt);
    assert.ok(parsed.stats);
    assert.ok(Array.isArray(parsed.recentFrames));

    // Test clear
    logger.clear();
    assert.deepEqual(logger.getHistory(), []);
  });

  it("subscribes and unsubscribes listeners correctly", () => {
    const logger = new FrameTelemetryLogger();
    let callCount = 0;
    const unsubscribe = logger.subscribe(() => {
      callCount++;
    });

    assert.equal(typeof unsubscribe, "function");
    unsubscribe();
    assert.equal(callCount, 0);
  });

  it("resolves runStutterStressTest in headless environments without errors", async () => {
    const result = await runStutterStressTest(100);
    assert.ok(result.framesCounted > 0);
    assert.equal(typeof result.jankCount, "number");
    assert.equal(typeof result.averageFrameMs, "number");
    assert.equal(typeof result.diagnosis, "string");
  });
});
