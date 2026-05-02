import type { Bank } from "@/types";

interface BankMarker {
  bank: Exclude<Bank, "unknown">;
  pattern: RegExp;
}

const MARKERS: readonly BankMarker[] = [
  { bank: "nubank", pattern: /\b(nubank|plano nucel)\b/i },
  { bank: "itau", pattern: /(?:^|\s)ita[uú](?: personnalit[eé])?(?=\s|$)/i },
  { bank: "bradesco", pattern: /\bbradesco\b/i },
];

export const detectBank = (text: string): Bank => {
  for (const { bank, pattern } of MARKERS) {
    if (pattern.test(text)) return bank;
  }
  return "unknown";
};
