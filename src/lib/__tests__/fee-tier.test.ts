import { describe, expect, it } from "vitest";
import { FEE_TIER_HEAVY_THRESHOLD, FEE_TIER_LEAN_THRESHOLD, feeTier } from "@/lib/fee-tier";

describe("feeTier", () => {
  it("classifies zero annual fee as free", () => {
    expect(feeTier(0, -100)).toBe("free");
  });

  it("classifies fee below the lean threshold", () => {
    expect(feeTier(FEE_TIER_LEAN_THRESHOLD * 1000, 1000)).toBe("lean");
  });

  it("classifies fee below the heavy threshold", () => {
    expect(feeTier(FEE_TIER_HEAVY_THRESHOLD * 1000, 1000)).toBe("heavy");
  });

  it("classifies fee above the heavy threshold as conditional", () => {
    expect(feeTier(401, 1000)).toBe("conditional");
  });

  it("classifies non-positive net value as conditional", () => {
    expect(feeTier(100, 0)).toBe("conditional");
    expect(feeTier(100, -1)).toBe("conditional");
  });
});
