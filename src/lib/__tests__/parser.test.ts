import { describe, expect, it } from "vitest";
import { runChain, type Parser, type ParserInput, type RawParserResult } from "@/lib/parser";
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
  });
});
