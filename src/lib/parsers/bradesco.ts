import type { Parser, ParserInput, RawParserResult } from "@/lib/parser";
import { fail, type Result } from "@/lib/result";
import type { ParseError } from "@/types";

export const bradescoParser: Parser = {
  bank: "bradesco",
  parse: (input: ParserInput): Result<RawParserResult, ParseError> =>
    fail({
      code: "UNSUPPORTED_BANK_LAYOUT",
      message: "Suporte a Bradesco em construção. Use entrada manual por enquanto.",
      fileName: input.fileName,
    }),
};
