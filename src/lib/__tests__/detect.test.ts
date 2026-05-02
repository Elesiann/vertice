import { describe, expect, it } from "vitest";
import { detectBank } from "@/lib/parsers/detect";

describe("detectBank", () => {
  it.each([
    ["Nubank fatura março", "nubank"],
    ["Olá, esta é a fatura. Plano NuCel R$ 10,00", "nubank"],
    ["Itaú Personnalité Visa Infinite", "itau"],
    ["Itau Visa Platinum", "itau"],
    ["Bradesco Elo Nanquim", "bradesco"],
  ] as const)("detects bank from %s", (text, expected) => {
    expect(detectBank(text)).toBe(expected);
  });

  it("returns unknown when no marker matches", () => {
    expect(detectBank("Random fatura sem identificação")).toBe("unknown");
  });

  it("returns unknown for empty text", () => {
    expect(detectBank("")).toBe("unknown");
  });

  it("matches case-insensitively", () => {
    expect(detectBank("NUBANK SOCIETARIA")).toBe("nubank");
  });

  it("does not false-positive on substrings", () => {
    expect(detectBank("BankrUNubankrupt mercado")).toBe("unknown");
  });
});
