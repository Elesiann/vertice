import { describe, expect, it } from "vitest";
import { nubankParser } from "@/lib/parsers/nubank";

const makeInput = (rawText: string, fileName = "fatura.pdf") => ({ rawText, fileName });

const HEADER_2026_04 = `
Olá, [HOLDER].
Esta é a sua fatura de
maio, no valor de
R$ 160,00
Data de vencimento: 08 MAI 2026
Período vigente: 01 ABR a 01 MAI
[HOLDER]
FATURA 08 MAI 2026 EMISSÃO E ENVIO 01 MAI 2026
RESUMO DA FATURA ATUAL
Total a pagar R$ 160,00
TRANSAÇÕES DE 01 ABR A 01 MAI
`.trim();

describe("nubankParser", () => {
  describe("layout detection", () => {
    it("returns UNSUPPORTED_BANK_LAYOUT when the FATURA year header is missing", () => {
      const result = nubankParser.parse(
        makeInput("Período vigente: 01 ABR a 01 MAI\n01 ABR Loja R$ 10,00"),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("UNSUPPORTED_BANK_LAYOUT");
      }
    });

    it("returns UNSUPPORTED_BANK_LAYOUT when the period is missing", () => {
      const result = nubankParser.parse(
        makeInput("FATURA 08 MAI 2026\nTotal a pagar R$ 50,00\n01 ABR Loja R$ 50,00"),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("UNSUPPORTED_BANK_LAYOUT");
      }
    });
  });

  describe("transaction parsing", () => {
    it("parses a single transaction with card suffix", () => {
      const text = `${HEADER_2026_04}\n04 ABR •••• 1234 Loja Teste R$ 100,00`;

      const result = nubankParser.parse(makeInput(text));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions).toHaveLength(1);
      expect(result.value.rawTransactions[0]).toMatchObject({
        date: "2026-04-04",
        description: "Loja Teste",
        amountBrl: 100,
        bank: "nubank",
        sourceFile: "fatura.pdf",
      });
    });

    it("parses a transaction without card suffix (Plano NuCel-style line)", () => {
      const text = `${HEADER_2026_04}\n01 ABR Plano NuCel R$ 10,00`;

      const result = nubankParser.parse(makeInput(text));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions).toHaveLength(1);
      expect(result.value.rawTransactions[0]?.description).toBe("Plano NuCel");
      expect(result.value.rawTransactions[0]?.amountBrl).toBe(10);
    });

    it("parses a negative amount with the Unicode minus", () => {
      const text = `${HEADER_2026_04}\n08 ABR Pagamento em 08 ABR −R$ 41,37`;

      const result = nubankParser.parse(makeInput(text));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions[0]?.amountBrl).toBe(-41.37);
    });

    it("parses BR-formatted amounts with thousand separators", () => {
      const text = `${HEADER_2026_04}\n15 ABR •••• 1234 Compra Cara R$ 1.857,72`;

      const result = nubankParser.parse(makeInput(text));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions[0]?.amountBrl).toBeCloseTo(1857.72, 2);
    });

    it("parses multiple transactions across multiple dates", () => {
      const text = `${HEADER_2026_04}
01 ABR Plano NuCel R$ 10,00
04 ABR •••• 1234 Loja A R$ 50,00
05 ABR •••• 1234 Loja B R$ 100,00
`.trim();

      const result = nubankParser.parse(makeInput(text));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions).toHaveLength(3);
      expect(result.value.rawTransactions.map((tx) => tx.date)).toEqual([
        "2026-04-01",
        "2026-04-04",
        "2026-04-05",
      ]);
    });

    it("preserves multi-card statements with different suffixes", () => {
      const text = `${HEADER_2026_04}
04 ABR •••• 1234 Loja A R$ 50,00
04 ABR •••• 5678 Loja B R$ 75,00
`.trim();

      const result = nubankParser.parse(makeInput(text));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions).toHaveLength(2);
      expect(result.value.rawTransactions[0]?.amountBrl).toBe(50);
      expect(result.value.rawTransactions[1]?.amountBrl).toBe(75);
    });

    it("skips lines that aren't transactions", () => {
      const text = `${HEADER_2026_04}
Outros lançamentos R$ 10,00
04 ABR •••• 1234 Loja R$ 50,00
Limite total R$ 12.600,00
`.trim();

      const result = nubankParser.parse(makeInput(text));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions).toHaveLength(1);
      expect(result.value.rawTransactions[0]?.description).toBe("Loja");
    });

    it("returns ok with a warning when no transactions parse but headers are valid", () => {
      const result = nubankParser.parse(makeInput(HEADER_2026_04));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rawTransactions).toHaveLength(0);
      expect(result.value.warnings.some((w) => w.includes("Nenhuma linha"))).toBe(true);
    });
  });

  describe("period and year inference", () => {
    it("derives the detected period from the Período vigente header", () => {
      const result = nubankParser.parse(makeInput(HEADER_2026_04));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.detectedPeriod).toEqual({
        start: "2026-04-01",
        end: "2026-05-01",
      });
    });

    it("infers the previous year for transactions in a cross-year period", () => {
      const text = `
FATURA 08 JAN 2026 EMISSÃO E ENVIO 01 JAN 2026
Período vigente: 01 DEZ a 01 JAN
Total a pagar R$ 50,00
20 DEZ •••• 1234 Compra Dezembro R$ 30,00
05 JAN •••• 1234 Compra Janeiro R$ 20,00
`.trim();

      const result = nubankParser.parse(makeInput(text));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.detectedPeriod).toEqual({
        start: "2025-12-01",
        end: "2026-01-01",
      });
      expect(result.value.rawTransactions[0]?.date).toBe("2025-12-20");
      expect(result.value.rawTransactions[1]?.date).toBe("2026-01-05");
    });
  });

  describe("checksum extraction", () => {
    it("captures the Total a pagar value as checksum", () => {
      const text = `${HEADER_2026_04}\n04 ABR •••• 1234 Loja R$ 160,00`;

      const result = nubankParser.parse(makeInput(text));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.checksum).toBe(160);
    });

    it("returns checksum=null when Total a pagar is absent", () => {
      const text = `
FATURA 08 MAI 2026
Período vigente: 01 ABR a 01 MAI
04 ABR •••• 1234 Loja R$ 50,00
`.trim();

      const result = nubankParser.parse(makeInput(text));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.checksum).toBeNull();
    });
  });
});
