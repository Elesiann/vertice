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
