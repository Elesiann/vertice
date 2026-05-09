import { describe, expect, it } from "vitest";
import { formatBrl, formatCashbackRate, formatMonths, formatPoints, formatUsd } from "@/lib/format";

describe("formatBrl", () => {
  it("formats with R$ prefix and BR thousand/decimal separators", () => {
    expect(formatBrl(1857.72)).toMatch(/R\$.*1\.857,72/);
  });

  it("handles zero", () => {
    expect(formatBrl(0)).toMatch(/R\$.*0,00/);
  });

  it("handles negatives", () => {
    expect(formatBrl(-100)).toMatch(/-/);
  });
});

describe("formatUsd", () => {
  it("formats with $ prefix and en-US separators", () => {
    expect(formatUsd(1234.5)).toBe("$1,234.50");
  });
});

describe("formatPoints", () => {
  it("groups thousands with the BR separator", () => {
    expect(formatPoints(1234567)).toMatch(/1\.234\.567/);
  });

  it("rounds floats to integers", () => {
    expect(formatPoints(80000.7)).toMatch(/80\.001/);
  });

  it("handles zero", () => {
    expect(formatPoints(0)).toBe("0");
  });
});

describe("formatMonths", () => {
  it("returns 'menos de 1 mês' under one month", () => {
    expect(formatMonths(0.5)).toBe("menos de 1 mês");
  });

  it("formats with one decimal place at one month and above", () => {
    expect(formatMonths(1)).toBe("1.0 meses");
    expect(formatMonths(6.234)).toBe("6.2 meses");
  });
});

describe("formatCashbackRate", () => {
  it("converts decimal fraction to human-readable percent (1.25%)", () => {
    expect(formatCashbackRate(0.0125)).toBe("1,25%");
  });

  it("handles 2% encoded as 0.02", () => {
    expect(formatCashbackRate(0.02)).toBe("2,00%");
  });

  it("handles zero", () => {
    expect(formatCashbackRate(0)).toBe("0,00%");
  });

  it("rounds to two decimals", () => {
    expect(formatCashbackRate(0.012345)).toBe("1,23%");
  });
});
