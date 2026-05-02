import type { Parser, ParserInput, RawParserResult } from "@/lib/parser";
import { fail, type Result } from "@/lib/result";
import type { ParseError } from "@/types";

export const nubankParser: Parser = {
  bank: "nubank",
  parse: (input: ParserInput): Result<RawParserResult, ParseError> =>
    fail({
      code: "UNSUPPORTED_BANK_LAYOUT",
      message: "Suporte a Nubank em construção. Use entrada manual por enquanto.",
      fileName: input.fileName,
    }),
};
