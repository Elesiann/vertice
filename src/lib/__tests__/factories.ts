import type { RawParserResult } from "@/lib/parser";
import type { RawTransaction, Transaction } from "@/types";

let nextId = 0;

const baseDefaults = (): Omit<Transaction, "category"> => ({
  id: `tx-${String(++nextId)}`,
  date: "2026-04-15",
  description: "Test merchant",
  amountBrl: 100,
  sourceFile: "test.pdf",
  bank: "nubank",
});

export const makeRaw = (overrides: Partial<RawTransaction> = {}): RawTransaction => ({
  ...baseDefaults(),
  ...overrides,
});

export const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  ...baseDefaults(),
  category: "domestic",
  ...overrides,
});

export const makeRawResult = (overrides: Partial<RawParserResult> = {}): RawParserResult => ({
  bank: "nubank",
  fileName: "fatura.pdf",
  rawTransactions: [makeRaw()],
  detectedPeriod: { start: "2026-04-15", end: "2026-04-15" },
  warnings: [],
  checksum: 100,
  ...overrides,
});
