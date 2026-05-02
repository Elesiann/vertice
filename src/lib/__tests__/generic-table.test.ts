import { describe, expect, it } from "vitest";
import { genericTableParser } from "@/lib/parsers/generic-table";
import type { PdfTextItem } from "@/lib/parsers/pdf-text";

const item = (text: string, x: number, y: number, page = 1): PdfTextItem => ({
  text,
  x,
  y,
  width: text.length * 6,
  height: 12,
  page,
});

const parse = (items: readonly PdfTextItem[]) =>
  genericTableParser.parse({
    rawText: items.map((i) => i.text).join(" "),
    fileName: "fatura.pdf",
    items,
  });

describe("genericTableParser", () => {
  describe("layout-agnostic extraction", () => {
    it("extracts a single transaction from a row of (date, description, amount) items", () => {
      const result = parse([
        item("01/04/2026", 50, 700),
        item("Mercado Aleatorio", 150, 700),
        item("R$ 100,00", 350, 700),
      ]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions).toHaveLength(1);
      expect(result.value.rawTransactions[0]).toMatchObject({
        date: "2026-04-01",
        description: "Mercado Aleatorio",
        amountBrl: 100,
        bank: "unknown",
      });
    });

    it("extracts multiple rows clustered by Y", () => {
      const result = parse([
        item("01/04/2026", 50, 700),
        item("Loja A", 150, 700),
        item("R$ 50,00", 350, 700),
        item("02/04/2026", 50, 680),
        item("Loja B", 150, 680),
        item("R$ 75,00", 350, 680),
      ]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions).toHaveLength(2);
      expect(result.value.rawTransactions.map((t) => t.amountBrl)).toEqual([50, 75]);
    });

    it("treats items with similar Y (within tolerance) as the same row", () => {
      const result = parse([
        item("01/04/2026", 50, 700),
        item("Loja", 150, 700.8),
        item("R$ 99,99", 350, 699.5),
      ]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions).toHaveLength(1);
    });

    it("handles negative amounts with Unicode minus", () => {
      const result = parse([
        item("08/04/2026", 50, 700),
        item("Pagamento", 150, 700),
        item("−R$ 41,37", 350, 700),
      ]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions[0]?.amountBrl).toBe(-41.37);
    });

    it("parses BR-formatted amounts with thousand separators", () => {
      const result = parse([
        item("15/04/2026", 50, 700),
        item("Compra Cara", 150, 700),
        item("R$ 1.857,72", 350, 700),
      ]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions[0]?.amountBrl).toBeCloseTo(1857.72, 2);
    });

    it("skips rows that lack a parseable date", () => {
      const result = parse([
        item("Total", 50, 700),
        item("", 150, 700),
        item("R$ 200,00", 350, 700),
      ]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions).toHaveLength(0);
    });

    it("skips rows that lack a parseable amount", () => {
      const result = parse([
        item("01/04/2026", 50, 700),
        item("Loja sem valor", 150, 700),
        item("descrição extra", 250, 700),
      ]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions).toHaveLength(0);
    });

    it("skips rows with fewer than 3 items", () => {
      const result = parse([item("01/04/2026", 50, 700), item("R$ 50,00", 350, 700)]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions).toHaveLength(0);
    });

    it("derives detectedPeriod from the min/max of extracted dates", () => {
      const result = parse([
        item("10/04/2026", 50, 700),
        item("Loja A", 150, 700),
        item("R$ 10,00", 350, 700),
        item("01/04/2026", 50, 680),
        item("Loja B", 150, 680),
        item("R$ 20,00", 350, 680),
        item("25/04/2026", 50, 660),
        item("Loja C", 150, 660),
        item("R$ 30,00", 350, 660),
      ]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.detectedPeriod).toEqual({
        start: "2026-04-01",
        end: "2026-04-25",
      });
    });
  });

  describe("warnings", () => {
    it("warns when no items are provided", () => {
      const result = genericTableParser.parse({
        rawText: "",
        fileName: "fatura.pdf",
        items: [],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions).toHaveLength(0);
      expect(result.value.warnings.some((w) => w.includes("zero items"))).toBe(true);
    });

    it("warns when items are present but no rows look like transactions", () => {
      const result = parse([item("Total", 50, 700), item("R$ 100,00", 350, 700)]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.warnings.some((w) => w.includes("não reconheceu"))).toBe(true);
    });

    it("warns about lower precision when transactions are extracted", () => {
      const result = parse([
        item("01/04/2026", 50, 700),
        item("Loja", 150, 700),
        item("R$ 50,00", 350, 700),
      ]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.warnings.some((w) => w.includes("precisão menor"))).toBe(true);
    });
  });

  describe("date format support", () => {
    it("parses DD/MM/YYYY", () => {
      const result = parse([
        item("01/04/2026", 50, 700),
        item("Loja", 150, 700),
        item("R$ 50,00", 350, 700),
      ]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions[0]?.date).toBe("2026-04-01");
    });

    it("parses DD/MM/YY by inferring the 20XX century", () => {
      const result = parse([
        item("01/04/26", 50, 700),
        item("Loja", 150, 700),
        item("R$ 50,00", 350, 700),
      ]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions[0]?.date).toBe("2026-04-01");
    });
  });
});
