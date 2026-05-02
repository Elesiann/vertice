import { describe, expect, it } from "vitest";
import { DEFAULT_PTAX_BRL_PER_USD, PTAX_LAST_VERIFIED, getPtaxRate } from "@/lib/ptax";

describe("ptax", () => {
  describe("getPtaxRate", () => {
    it("returns the default when no override is provided", () => {
      expect(getPtaxRate()).toBe(DEFAULT_PTAX_BRL_PER_USD);
    });

    it("returns the override when provided", () => {
      expect(getPtaxRate(5.0)).toBe(5.0);
    });

    it("returns the override even when it equals zero", () => {
      expect(getPtaxRate(0)).toBe(0);
    });
  });

  describe("constants", () => {
    it("ships a positive default rate", () => {
      expect(DEFAULT_PTAX_BRL_PER_USD).toBeGreaterThan(0);
    });

    it("ships a verified date in ISO format", () => {
      expect(PTAX_LAST_VERIFIED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
