import assert from "node:assert/strict";
import test from "node:test";
import {
  clampSeekTime,
  computeBufferedPercent,
  formatTimecode,
  isDirectMediaUrl,
  PLAYBACK_SPEED_OPTIONS,
  resolveNativeVideoShortcut,
} from "./player-hud-controls";

test("formatTimecode formats sub-hour, hour+, and invalid durations cleanly", () => {
  assert.equal(formatTimecode(0), "0:00");
  assert.equal(formatTimecode(65), "1:05");
  assert.equal(formatTimecode(3661), "1:01:01");
  assert.equal(formatTimecode(-5), "0:00");
  assert.equal(formatTimecode(Number.NaN), "0:00");
});

test("clampSeekTime bounds values within [0, duration]", () => {
  assert.equal(clampSeekTime(-10, 120), 0);
  assert.equal(clampSeekTime(45, 120), 45);
  assert.equal(clampSeekTime(150, 120), 120);
  assert.equal(clampSeekTime(10, 0), 0);
});

test("computeBufferedPercent tracks active range and clamps to 0..100", () => {
  const ranges = [
    { start: 0, end: 30 },
    { start: 50, end: 85 },
  ];
  assert.equal(computeBufferedPercent(ranges, 12, 100), 30);
  assert.equal(computeBufferedPercent(ranges, 60, 100), 85);
  assert.equal(computeBufferedPercent([], 10, 100), 0);
  assert.equal(computeBufferedPercent([{ start: 0, end: 150 }], 10, 100), 100);
});

test("isDirectMediaUrl recognizes direct HTML5 video streams and rejects unsafe/non-video URLs", () => {
  assert.equal(isDirectMediaUrl("https://cdn.example.com/movie.mp4"), true);
  assert.equal(isDirectMediaUrl("https://cdn.example.com/clip.webm?token=abc"), true);
  assert.equal(isDirectMediaUrl("https://cdn.example.com/master.m3u8"), true);
  assert.equal(isDirectMediaUrl("blob:https://zoku.app/1234"), true);
  assert.equal(isDirectMediaUrl("https://embed.example.com/movie/550"), false);
  assert.equal(isDirectMediaUrl("javascript:alert(1)"), false);
  assert.equal(isDirectMediaUrl(""), false);
});

test("resolveNativeVideoShortcut maps standard cinema player keys and ignores modifiers", () => {
  assert.deepEqual(resolveNativeVideoShortcut({ key: " " }), { type: "toggle_play" });
  assert.deepEqual(resolveNativeVideoShortcut({ key: "k" }), { type: "toggle_play" });
  assert.deepEqual(resolveNativeVideoShortcut({ key: "ArrowLeft" }), { type: "seek_delta", seconds: -10 });
  assert.deepEqual(resolveNativeVideoShortcut({ key: "ArrowRight" }), { type: "seek_delta", seconds: 10 });
  assert.deepEqual(resolveNativeVideoShortcut({ key: "ArrowUp" }), { type: "volume_delta", delta: 0.1 });
  assert.deepEqual(resolveNativeVideoShortcut({ key: "ArrowDown" }), { type: "volume_delta", delta: -0.1 });
  assert.deepEqual(resolveNativeVideoShortcut({ key: "m" }), { type: "toggle_mute" });
  assert.deepEqual(resolveNativeVideoShortcut({ key: "F" }), { type: "toggle_fullscreen" });
  assert.deepEqual(resolveNativeVideoShortcut({ key: "t" }), { type: "toggle_theater" });
  assert.deepEqual(resolveNativeVideoShortcut({ key: "c" }), { type: "toggle_captions" });
  assert.deepEqual(resolveNativeVideoShortcut({ key: "5" }), { type: "seek_percent", percent: 50 });

  assert.equal(resolveNativeVideoShortcut({ key: "f", ctrlKey: true }), null);
  assert.equal(resolveNativeVideoShortcut({ key: " ", metaKey: true }), null);
  assert.ok(PLAYBACK_SPEED_OPTIONS.includes(1));
});
