import { categorizeBatch } from "@/lib/categorizer";
import { bradescoParser } from "@/lib/parsers/bradesco";
import { detectBank } from "@/lib/parsers/detect";
import { computeLayoutFingerprint } from "@/lib/parsers/fingerprint";
import { genericTableParser } from "@/lib/parsers/generic-table";
import { itauParser } from "@/lib/parsers/itau";
import { nubankParser } from "@/lib/parsers/nubank";
import type { PdfTextItem } from "@/lib/parsers/pdf-text";
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
  items?: readonly PdfTextItem[];
}

export interface RawParserResult {
  bank: Bank;
  fileName: string;
  rawTransactions: RawTransaction[];
  detectedPeriod: DateRange;
  warnings: string[];
  checksum: number | null;
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
  txs.reduce(
    (sum, tx) => (tx.category === "payment" || tx.category === "refund" ? sum : sum + tx.amountBrl),
    0,
  );

const finalize = (
  raw: RawParserResult,
  rawText: string,
  layerUsed: ParserResult["layerUsed"],
  extraWarnings: readonly string[],
): ParserResult => ({
  bank: raw.bank,
  fileName: raw.fileName,
  transactions: categorizeBatch(raw.rawTransactions),
  detectedPeriod: raw.detectedPeriod,
  warnings: [...raw.warnings, ...extraWarnings],
  checksum: raw.checksum,
  layoutFingerprint: computeLayoutFingerprint(rawText),
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
      const finalized = finalize(layer1.value, input.rawText, "bank-specific", []);
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
      finalize(layer3.value, input.rawText, "generic-table", [
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

const PARSERS_BY_BANK: Readonly<Record<Exclude<Bank, "unknown">, Parser>> = {
  nubank: nubankParser,
  itau: itauParser,
  bradesco: bradescoParser,
};

export const parseStatement = (input: ParserInput): Result<ParserResult, ParseError> => {
  const bank = detectBank(input.rawText);
  const bankSpecific = bank === "unknown" ? null : PARSERS_BY_BANK[bank];
  return runChain(input, { bankSpecific, genericTable: genericTableParser });
};
