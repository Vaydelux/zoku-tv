import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  probeGpuCapabilities,
  GPU_FLAG_PRESETS,
  readStoredHardwareFlags,
} from "./gpu-diagnostics";

describe("GPU Diagnostics and Hardware Acceleration Flags (32-Bit Android TV)", () => {
  it("probes 32-bit Android TV devices with constrained GPU/RAM into low_spec_32bit_tv tier", () => {
    const caps = probeGpuCapabilities({
      userAgent:
        "Mozilla/5.0 (Linux; Android 9; AFTMM Build/PS7233; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.0.0 Mobile Safari/537.36 Downloader/1.4.4",
      platform: "Linux armv7l",
      hardwareConcurrency: 4,
      deviceMemory: 1,
    });

    assert.equal(caps.is32BitArchitecture, true);
    assert.equal(caps.isAndroidTvOrStick, true);
    assert.equal(caps.tier, "low_spec_32bit_tv");
    assert.equal(caps.tierTitle, "32-Bit Constrained TV GPU");
    assert.ok(caps.recommendations.length >= 3);
  });

  it("probes high-spec desktop devices into high_spec_desktop tier", () => {
    const caps = probeGpuCapabilities({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      platform: "Win32",
      hardwareConcurrency: 16,
      deviceMemory: 32,
    });

    assert.equal(caps.is32BitArchitecture, false);
    assert.equal(caps.isAndroidTvOrStick, false);
    assert.equal(caps.tier, "high_spec_desktop");
  });

  it("provides 32-Bit TV Recommended preset with full compositing and blur bypass enabled", () => {
    const preset = GPU_FLAG_PRESETS.tv32BitRecommended;
    assert.equal(preset.flags.forceGpuCompositing, true);
    assert.equal(preset.flags.bypassBackdropFilter, true);
    assert.equal(preset.flags.limitTextureResolution, true);
    assert.equal(preset.flags.cssLayoutContainment, true);
    assert.equal(preset.flags.reducedOverdraw, true);
    assert.equal(preset.flags.railInertiaFriction, true);
  });

  it("provides Desktop Defaults preset with standard blur effects", () => {
    const preset = GPU_FLAG_PRESETS.standardDesktop;
    assert.equal(preset.flags.forceGpuCompositing, false);
    assert.equal(preset.flags.bypassBackdropFilter, false);
    assert.equal(preset.flags.limitTextureResolution, false);
    assert.equal(preset.flags.cssLayoutContainment, true);
    assert.equal(preset.flags.railInertiaFriction, true);
  });

  it("reads stored hardware flags fallback tier correctly when storage is empty", () => {
    const fallbackLowSpec = readStoredHardwareFlags("low_spec_32bit_tv");
    assert.equal(fallbackLowSpec.forceGpuCompositing, true);
    assert.equal(fallbackLowSpec.bypassBackdropFilter, true);

    const fallbackDesktop = readStoredHardwareFlags("high_spec_desktop");
    assert.equal(fallbackDesktop.forceGpuCompositing, false);
    assert.equal(fallbackDesktop.bypassBackdropFilter, false);
  });
});
