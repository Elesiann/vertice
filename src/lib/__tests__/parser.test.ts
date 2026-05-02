import { describe, expect, it } from "vitest";
import {
  parseStatement,
  runChain,
  type Parser,
  type ParserInput,
  type RawParserResult,
} from "@/lib/parser";
import { fail, ok, type Result } from "@/lib/result";
import { makeRaw, makeRawResult } from "@/lib/__tests__/factories";
import type { ParseError } from "@/types";

const baseInput: ParserInput = {
  rawText: "irrelevant for these tests",
  fileName: "fatura.pdf",
};

const stubParser = (bank: Parser["bank"], result: Result<RawParserResult, ParseError>): Parser => ({
  bank,
  parse: () => result,
});

const emptyGeneric: Parser = stubParser(
  "unknown",
  ok({
    bank: "unknown",
    fileName: "fatura.pdf",
    rawTransactions: [],
    detectedPeriod: { start: "", end: "" },
    warnings: [],
    checksum: null,
    layoutFingerprint: null,
  }),
);

describe("runChain", () => {
  describe("Layer 1 success path", () => {
    it("returns the bank-specific result when checksum matches", () => {
      const bankSpecific = stubParser(
        "nubank",
        ok(
          makeRawResult({
            rawTransactions: [makeRaw({ amountBrl: 100 })],
            checksum: 100,
          }),
        ),
      );

      const result = runChain(baseInput, {
        bankSpecific,
        genericTable: emptyGeneric,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.layerUsed).toBe("bank-specific");
        expect(result.value.transactions).toHaveLength(1);
      }
    });

    it("returns the bank-specific result when checksum is null", () => {
      const bankSpecific = stubParser(
        "nubank",
        ok(
          makeRawResult({
            rawTransactions: [makeRaw()],
            checksum: null,
          }),
        ),
      );

      const result = runChain(baseInput, {
        bankSpecific,
        genericTable: emptyGeneric,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.layerUsed).toBe("bank-specific");
      }
    });

    it("accepts checksum within R$0.01 tolerance", () => {
      const bankSpecific = stubParser(
        "nubank",
        ok(
          makeRawResult({
            rawTransactions: [makeRaw({ amountBrl: 100.005 })],
            checksum: 100.0,
          }),
        ),
      );

      const result = runChain(baseInput, {
        bankSpecific,
        genericTable: emptyGeneric,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.layerUsed).toBe("bank-specific");
      }
    });

    it("excludes payment and refund transactions from the checksum sum", () => {
      const bankSpecific = stubParser(
        "nubank",
        ok(
          makeRawResult({
            rawTransactions: [
              makeRaw({ id: "buy", amountBrl: 100, description: "Loja" }),
              makeRaw({
                id: "pay",
                amountBrl: -100,
                description: "Pagamento em 08 ABR",
              }),
            ],
            checksum: 100,
          }),
        ),
      );

      const result = runChain(baseInput, {
        bankSpecific,
        genericTable: emptyGeneric,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.layerUsed).toBe("bank-specific");
      }
    });
  });

  describe("Layer 2 checksum failure → Layer 3 fallback", () => {
    it("falls through to generic table when checksum mismatches", () => {
      const bankSpecific = stubParser(
        "nubank",
        ok(
          makeRawResult({
            rawTransactions: [makeRaw({ amountBrl: 50 })],
            checksum: 100,
          }),
        ),
      );
      const genericTable = stubParser(
        "unknown",
        ok({
          bank: "unknown",
          fileName: "fatura.pdf",
          rawTransactions: [makeRaw({ id: "g", amountBrl: 80 })],
          detectedPeriod: { start: "2026-04-15", end: "2026-04-15" },
          warnings: [],
          checksum: null,
          layoutFingerprint: null,
        }),
      );

      const result = runChain(baseInput, { bankSpecific, genericTable });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.layerUsed).toBe("generic-table");
        expect(result.value.warnings).toContainEqual(expect.stringContaining("checksum mismatch"));
        expect(result.value.warnings).toContainEqual(expect.stringContaining("Fallback"));
      }
    });
  });

  describe("Layer 1 throw/fail → Layer 3 fallback", () => {
    it("falls through to generic table when bank parser fails", () => {
      const bankSpecific = stubParser(
        "nubank",
        fail<ParseError>({
          code: "UNSUPPORTED_BANK_LAYOUT",
          message: "stub não implementado",
          fileName: "fatura.pdf",
        }),
      );
      const genericTable = stubParser(
        "unknown",
        ok({
          bank: "unknown",
          fileName: "fatura.pdf",
          rawTransactions: [makeRaw({ id: "g", amountBrl: 80 })],
          detectedPeriod: { start: "2026-04-15", end: "2026-04-15" },
          warnings: [],
          checksum: null,
          layoutFingerprint: null,
        }),
      );

      const result = runChain(baseInput, { bankSpecific, genericTable });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.layerUsed).toBe("generic-table");
        expect(result.value.warnings).toContainEqual(expect.stringContaining("Layer 1 falhou"));
      }
    });
  });

  describe("no bank-specific parser → Layer 3 directly", () => {
    it("skips Layer 1 when bankSpecific is null", () => {
      const genericTable = stubParser(
        "unknown",
        ok({
          bank: "unknown",
          fileName: "fatura.pdf",
          rawTransactions: [makeRaw({ id: "g" })],
          detectedPeriod: { start: "2026-04-15", end: "2026-04-15" },
          warnings: [],
          checksum: null,
          layoutFingerprint: null,
        }),
      );

      const result = runChain(baseInput, {
        bankSpecific: null,
        genericTable,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.layerUsed).toBe("generic-table");
      }
    });
  });

  describe("All layers exhausted", () => {
    it("returns ALL_LAYERS_FAILED when Layer 1 fails and Layer 3 returns no transactions", () => {
      const bankSpecific = stubParser(
        "nubank",
        fail<ParseError>({
          code: "UNSUPPORTED_BANK_LAYOUT",
          message: "stub",
          fileName: "fatura.pdf",
        }),
      );

      const result = runChain(baseInput, {
        bankSpecific,
        genericTable: emptyGeneric,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ALL_LAYERS_FAILED");
        expect(result.error.fileName).toBe("fatura.pdf");
      }
    });

    it("returns ALL_LAYERS_FAILED when bankSpecific is null and Layer 3 is empty", () => {
      const result = runChain(baseInput, {
        bankSpecific: null,
        genericTable: emptyGeneric,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ALL_LAYERS_FAILED");
      }
    });
  });

  describe("categorization at finalize", () => {
    it("runs the categorizer on raw transactions before returning", () => {
      const bankSpecific = stubParser(
        "nubank",
        ok(
          makeRawResult({
            rawTransactions: [makeRaw({ id: "intl", description: "AMAZON US" })],
            checksum: 100,
          }),
        ),
      );

      const result = runChain(baseInput, {
        bankSpecific,
        genericTable: emptyGeneric,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.transactions[0]?.category).toBe("international");
      }
    });

    it("populates layoutFingerprint with a non-empty hex hash", () => {
      const bankSpecific = stubParser(
        "nubank",
        ok(makeRawResult({ rawTransactions: [makeRaw()], checksum: 100 })),
      );

      const result = runChain(
        {
          rawText: "FATURA 08 MAI 2026 RESUMO DA FATURA Total a pagar R$ 100,00",
          fileName: "f.pdf",
        },
        { bankSpecific, genericTable: emptyGeneric },
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.layoutFingerprint).toMatch(/^[0-9a-f]{8}$/);
      }
    });
  });
});

describe("parseStatement (wired dispatcher)", () => {
  const NUBANK_TEXT = `
Nubank fatura
FATURA 08 MAI 2026 EMISSÃO E ENVIO 01 MAI 2026
RESUMO DA FATURA ATUAL
Total a pagar R$ 100,00
Período vigente: 01 ABR a 01 MAI
TRANSAÇÕES DE 01 ABR A 01 MAI
04 ABR •••• 1234 Loja Teste R$ 100,00
`.trim();

  it("routes detected Nubank text through the bank-specific parser", () => {
    const result = parseStatement({ rawText: NUBANK_TEXT, fileName: "fatura.pdf" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bank).toBe("nubank");
    expect(result.value.layerUsed).toBe("bank-specific");
    expect(result.value.transactions).toHaveLength(1);
  });

  it("routes Itaú-detected text to the stub, which falls through to Layer 3", () => {
    const result = parseStatement({
      rawText: "Itaú Personnalité Visa Infinite\nDemonstrativo de pagamentos",
      fileName: "fatura.pdf",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("ALL_LAYERS_FAILED");
  });

  it("routes unknown text directly to Layer 3 (no bank detected)", () => {
    const result = parseStatement({
      rawText: "Sem identificação de banco aqui",
      fileName: "fatura.pdf",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("ALL_LAYERS_FAILED");
  });

  it("falls through to Layer 3 with positional items when bank parser fails", () => {
    const result = parseStatement({
      rawText: "Bradesco Visa\nrandom text",
      fileName: "fatura.pdf",
      items: [
        { text: "01/04/2026", x: 50, y: 700, width: 50, height: 12, page: 1 },
        { text: "Loja", x: 150, y: 700, width: 30, height: 12, page: 1 },
        { text: "R$ 50,00", x: 350, y: 700, width: 50, height: 12, page: 1 },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.layerUsed).toBe("generic-table");
    expect(result.value.transactions).toHaveLength(1);
    expect(result.value.warnings.some((w) => w.includes("Layer 1 falhou"))).toBe(true);
  });
});
