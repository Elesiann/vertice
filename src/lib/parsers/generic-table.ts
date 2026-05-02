import type { Parser, ParserInput, RawParserResult } from "@/lib/parser";
import { ok, type Result } from "@/lib/result";
import type { ParseError } from "@/types";

export const genericTableParser: Parser = {
  bank: "unknown",
  parse: (input: ParserInput): Result<RawParserResult, ParseError> =>
    ok({
      bank: "unknown",
      fileName: input.fileName,
      rawTransactions: [],
      detectedPeriod: { start: "", end: "" },
      warnings: ["Parser genérico ainda não implementado (Milestone 3)."],
      checksum: null,
      layoutFingerprint: null,
    }),
};
