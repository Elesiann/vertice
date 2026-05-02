import { describe, expect, it } from "vitest";
import { formatBrl, formatMonths, formatUsd } from "@/lib/format";

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

describe("formatMonths", () => {
  it("returns 'menos de 1 mês' under one month", () => {
    expect(formatMonths(0.5)).toBe("menos de 1 mês");
  });

  it("formats with one decimal place at one month and above", () => {
    expect(formatMonths(1)).toBe("1.0 meses");
    expect(formatMonths(6.234)).toBe("6.2 meses");
  });
});
