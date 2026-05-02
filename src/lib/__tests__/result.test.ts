import { describe, expect, it } from "vitest";
import { fail, isFail, isOk, map, mapError, ok, unwrapOr, type Result } from "@/lib/result";

describe("Result", () => {
  describe("ok", () => {
    it("wraps a value into an ok variant", () => {
      const result = ok(42);

      expect(result).toEqual({ ok: true, value: 42 });
    });

    it("preserves complex value shapes", () => {
      const value = { nested: { count: 3 } };

      const result = ok(value);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(value);
      }
    });
  });

  describe("fail", () => {
    it("wraps an error into a fail variant", () => {
      const result = fail("oops");

      expect(result).toEqual({ ok: false, error: "oops" });
    });
  });

  describe("isOk / isFail", () => {
    it("narrows Result to the ok variant", () => {
      const result: Result<number, string> = ok(1);

      expect(isOk(result)).toBe(true);
      expect(isFail(result)).toBe(false);
    });

    it("narrows Result to the fail variant", () => {
      const result: Result<number, string> = fail("bad");

      expect(isOk(result)).toBe(false);
      expect(isFail(result)).toBe(true);
    });
  });

  describe("map", () => {
    it("transforms the value when ok", () => {
      const result = map(ok(5), (n) => n * 2);

      expect(result).toEqual({ ok: true, value: 10 });
    });

    it("passes through unchanged when fail", () => {
      const original: Result<number, string> = fail("nope");

      const result = map(original, (n) => n * 2);

      expect(result).toBe(original);
    });
  });

  describe("mapError", () => {
    it("transforms the error when fail", () => {
      const result = mapError(fail("low"), (s) => s.toUpperCase());

      expect(result).toEqual({ ok: false, error: "LOW" });
    });

    it("passes through unchanged when ok", () => {
      const original: Result<number, string> = ok(3);

      const result = mapError(original, (s) => s.length);

      expect(result).toBe(original);
    });
  });

  describe("unwrapOr", () => {
    it("returns the value when ok", () => {
      expect(unwrapOr(ok(7), 0)).toBe(7);
    });

    it("returns the fallback when fail", () => {
      expect(unwrapOr(fail("err") as Result<number, string>, 0)).toBe(0);
    });
  });
});
