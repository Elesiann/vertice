import { categorizeBatch } from "@/lib/categorizer";
import { fail, ok, type Result } from "@/lib/result";
import type {
  Bank,
  DateRange,
  ParseError,
  ParserResult,
  RawTransaction,
  Transaction,
} from "@/types";

export interface ParserInput {
  rawText: string;
  fileName: string;
}

export interface RawParserResult {
  bank: Bank;
  fileName: string;
  rawTransactions: RawTransaction[];
  detectedPeriod: DateRange;
  warnings: string[];
  checksum: number | null;
  layoutFingerprint: string | null;
}

export interface Parser {
  bank: Bank;
  parse: (input: ParserInput) => Result<RawParserResult, ParseError>;
}

export interface ChainOptions {
  bankSpecific: Parser | null;
  genericTable: Parser;
}

const CHECKSUM_TOLERANCE = 0.01;

const totalForChecksum = (txs: readonly Transaction[]): number =>
  txs
    .filter((tx) => tx.category !== "payment" && tx.category !== "refund")
    .reduce((sum, tx) => sum + tx.amountBrl, 0);

const finalize = (
  raw: RawParserResult,
  layerUsed: ParserResult["layerUsed"],
  extraWarnings: readonly string[],
): ParserResult => ({
  bank: raw.bank,
  fileName: raw.fileName,
  transactions: categorizeBatch(raw.rawTransactions),
  detectedPeriod: raw.detectedPeriod,
  warnings: [...raw.warnings, ...extraWarnings],
  checksum: raw.checksum,
  layoutFingerprint: raw.layoutFingerprint,
  layerUsed,
});

export const runChain = (
  input: ParserInput,
  options: ChainOptions,
): Result<ParserResult, ParseError> => {
  const accumulatedWarnings: string[] = [];

  if (options.bankSpecific) {
    const layer1 = options.bankSpecific.parse(input);
    if (layer1.ok) {
      const finalized = finalize(layer1.value, "bank-specific", []);
      const expected = layer1.value.checksum;
      if (expected === null) return ok(finalized);
      const computed = totalForChecksum(finalized.transactions);
      if (Math.abs(computed - expected) <= CHECKSUM_TOLERANCE) return ok(finalized);
      accumulatedWarnings.push(
        `Layer 1 (${options.bankSpecific.bank}) checksum mismatch: ` +
          `esperado R$ ${expected.toFixed(2)}, ` +
          `calculado R$ ${computed.toFixed(2)}. Caindo para parser genérico.`,
      );
    } else {
      accumulatedWarnings.push(`Layer 1 falhou: ${layer1.error.code} - ${layer1.error.message}`);
    }
  }

  const layer3 = options.genericTable.parse(input);
  if (layer3.ok && layer3.value.rawTransactions.length > 0) {
    return ok(
      finalize(layer3.value, "generic-table", [
        ...accumulatedWarnings,
        "Fallback: parser genérico foi usado (Layer 3).",
      ]),
    );
  }

  return fail({
    code: "ALL_LAYERS_FAILED",
    message:
      "Não conseguimos extrair transações desta fatura automaticamente. " + "Tente entrada manual.",
    fileName: input.fileName,
  });
};
