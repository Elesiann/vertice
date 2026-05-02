import { describe, expect, it } from "vitest";
import { dateRangeOf } from "@/lib/date-range";

describe("dateRangeOf", () => {
  it("returns empty range for empty input", () => {
    expect(dateRangeOf([])).toEqual({ start: "", end: "" });
  });

  it("returns the single date as both start and end", () => {
    expect(dateRangeOf(["2026-04-15"])).toEqual({
      start: "2026-04-15",
      end: "2026-04-15",
    });
  });

  it("returns min and max for unsorted input", () => {
    expect(dateRangeOf(["2026-04-15", "2026-01-01", "2026-08-30"])).toEqual({
      start: "2026-01-01",
      end: "2026-08-30",
    });
  });

  it("computes the range in a single pass (independent of order)", () => {
    const ascending = dateRangeOf(["2026-01-01", "2026-04-15", "2026-08-30"]);
    const descending = dateRangeOf(["2026-08-30", "2026-04-15", "2026-01-01"]);
    expect(ascending).toEqual(descending);
  });

  it("handles duplicates", () => {
    expect(dateRangeOf(["2026-04-15", "2026-04-15", "2026-04-15"])).toEqual({
      start: "2026-04-15",
      end: "2026-04-15",
    });
  });
});
