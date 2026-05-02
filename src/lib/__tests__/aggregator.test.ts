import { describe, expect, it } from "vitest";
import { aggregate } from "@/lib/aggregator";
import { DEFAULT_PTAX_BRL_PER_USD } from "@/lib/ptax";
import { makeTx } from "@/lib/__tests__/factories";

describe("aggregate", () => {
  describe("empty input", () => {
    it("returns a zero aggregate with empty period strings", () => {
      const result = aggregate([]);

      expect(result).toEqual({
        periodStart: "",
        periodEnd: "",
        monthsCovered: 0,
        totalDomesticBrl: 0,
        totalInternationalBrl: 0,
        totalInternationalUsd: 0,
        monthlyAvgDomesticBrl: 0,
        monthlyAvgInternationalUsd: 0,
        ptaxRateUsed: DEFAULT_PTAX_BRL_PER_USD,
        transactionCount: 0,
        duplicatesRemoved: 0,
        byBank: {},
      });
    });

    it("honors a ptax override even when input is empty", () => {
      const result = aggregate([], { ptaxRate: 4.2 });

      expect(result.ptaxRateUsed).toBe(4.2);
    });
  });

  describe("period detection", () => {
    it("derives start and end from the min/max date of spending transactions", () => {
      const result = aggregate([
        makeTx({ date: "2026-01-15", category: "domestic" }),
        makeTx({ date: "2026-04-30", category: "domestic" }),
        makeTx({ date: "2026-03-10", category: "domestic" }),
      ]);

      expect(result.periodStart).toBe("2026-01-15");
      expect(result.periodEnd).toBe("2026-04-30");
    });

    it("ignores payment and refund dates when deriving the period", () => {
      const result = aggregate([
        makeTx({ date: "2026-04-15", category: "domestic" }),
        makeTx({
          date: "2026-08-01",
          category: "payment",
          amountBrl: -500,
        }),
        makeTx({
          date: "2025-12-01",
          category: "refund",
          amountBrl: -50,
        }),
      ]);

      expect(result.periodStart).toBe("2026-04-15");
      expect(result.periodEnd).toBe("2026-04-15");
    });

    it("clamps totals to a periodOverride when provided", () => {
      const txs = [
        makeTx({ date: "2026-01-15", amountBrl: 100, category: "domestic" }),
        makeTx({ date: "2026-04-15", amountBrl: 200, category: "domestic" }),
      ];

      const result = aggregate(txs, {
        periodOverride: { start: "2026-04-01", end: "2026-04-30" },
      });

      expect(result.periodStart).toBe("2026-04-01");
      expect(result.totalDomesticBrl).toBe(200);
    });
  });

  describe("monthsCovered", () => {
    it("computes the float number of months from the period span", () => {
      const result = aggregate([
        makeTx({ date: "2026-01-01", category: "domestic" }),
        makeTx({ date: "2026-04-01", category: "domestic" }),
      ]);

      expect(result.monthsCovered).toBeGreaterThan(2.9);
      expect(result.monthsCovered).toBeLessThan(3.1);
    });

    it("returns 0 months when start equals end", () => {
      const result = aggregate([makeTx({ date: "2026-04-15" })]);

      expect(result.monthsCovered).toBe(0);
      expect(result.monthlyAvgDomesticBrl).toBe(0);
    });
  });

  describe("totals and currency conversion", () => {
    it("sums domestic transactions into totalDomesticBrl", () => {
      const result = aggregate([
        makeTx({ amountBrl: 100, category: "domestic" }),
        makeTx({ amountBrl: 50, category: "domestic" }),
      ]);

      expect(result.totalDomesticBrl).toBe(150);
    });

    it("converts international BRL to USD using the default PTAX", () => {
      const result = aggregate([makeTx({ amountBrl: 560, category: "international" })]);

      expect(result.totalInternationalBrl).toBe(560);
      expect(result.totalInternationalUsd).toBeCloseTo(100, 5);
      expect(result.ptaxRateUsed).toBe(DEFAULT_PTAX_BRL_PER_USD);
    });

    it("uses a ptax override when provided", () => {
      const result = aggregate([makeTx({ amountBrl: 500, category: "international" })], {
        ptaxRate: 5,
      });

      expect(result.totalInternationalUsd).toBe(100);
      expect(result.ptaxRateUsed).toBe(5);
    });

    it("ignores iof, fees, and payment from spending totals", () => {
      const result = aggregate([
        makeTx({ amountBrl: 100, category: "domestic" }),
        makeTx({ amountBrl: 5, category: "iof" }),
        makeTx({ amountBrl: 30, category: "fees" }),
        makeTx({ amountBrl: -200, category: "payment" }),
      ]);

      expect(result.totalDomesticBrl).toBe(100);
      expect(result.totalInternationalBrl).toBe(0);
    });
  });

  describe("refund netting", () => {
    it("nets a matching domestic refund against the domestic total", () => {
      const result = aggregate([
        makeTx({
          date: "2026-04-10",
          amountBrl: 200,
          description: "Loja A",
          category: "domestic",
        }),
        makeTx({
          date: "2026-04-20",
          amountBrl: -200,
          description: "Estorno Loja A",
          category: "refund",
        }),
      ]);

      expect(result.totalDomesticBrl).toBe(0);
    });

    it("nets a matching international refund against the international total", () => {
      const result = aggregate([
        makeTx({
          date: "2026-04-10",
          amountBrl: 560,
          description: "Foreign shop",
          category: "international",
        }),
        makeTx({
          date: "2026-04-20",
          amountBrl: -560,
          description: "Estorno foreign",
          category: "refund",
        }),
      ]);

      expect(result.totalInternationalBrl).toBe(0);
    });

    it("attributes an unmatched refund to domestic by default", () => {
      const result = aggregate([
        makeTx({ amountBrl: 100, category: "domestic" }),
        makeTx({ amountBrl: -75, category: "refund" }),
      ]);

      expect(result.totalDomesticBrl).toBe(25);
    });

    it("does not match a refund to a transaction more than 60 days away", () => {
      const result = aggregate([
        makeTx({
          date: "2026-01-01",
          amountBrl: 100,
          category: "international",
        }),
        makeTx({
          date: "2026-06-01",
          amountBrl: -100,
          category: "refund",
        }),
      ]);

      expect(result.totalInternationalBrl).toBe(100);
      expect(result.totalDomesticBrl).toBe(-100);
    });
  });

  describe("dedup", () => {
    it("collapses duplicate transactions by (date|description|amount|bank)", () => {
      const tx = {
        date: "2026-04-15",
        amountBrl: 100,
        description: "Loja",
        bank: "nubank",
        category: "domestic",
      } as const;
      const result = aggregate([makeTx({ ...tx }), makeTx({ ...tx }), makeTx({ ...tx })]);

      expect(result.transactionCount).toBe(1);
      expect(result.duplicatesRemoved).toBe(2);
      expect(result.totalDomesticBrl).toBe(100);
    });

    it("does not collapse transactions that differ in any key field", () => {
      const result = aggregate([
        makeTx({ date: "2026-04-15", amountBrl: 100, category: "domestic" }),
        makeTx({ date: "2026-04-15", amountBrl: 100.01, category: "domestic" }),
      ]);

      expect(result.transactionCount).toBe(2);
      expect(result.duplicatesRemoved).toBe(0);
    });
  });

  describe("byBank", () => {
    it("sums spending per bank", () => {
      const result = aggregate([
        makeTx({ bank: "nubank", amountBrl: 100, category: "domestic" }),
        makeTx({ bank: "nubank", amountBrl: 50, category: "international" }),
        makeTx({ bank: "itau", amountBrl: 200, category: "domestic" }),
      ]);

      expect(result.byBank).toEqual({ nubank: 150, itau: 200 });
    });

    it("excludes refunds, fees, iof, and payments from byBank", () => {
      const result = aggregate([
        makeTx({ bank: "nubank", amountBrl: 100, category: "domestic" }),
        makeTx({ bank: "nubank", amountBrl: 30, category: "fees" }),
        makeTx({ bank: "nubank", amountBrl: -10, category: "refund" }),
      ]);

      expect(result.byBank).toEqual({ nubank: 100 });
    });
  });
});
