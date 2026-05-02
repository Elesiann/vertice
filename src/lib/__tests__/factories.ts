import type { RawTransaction } from "@/lib/categorizer";

let nextId = 0;

export const makeRaw = (overrides: Partial<RawTransaction> = {}): RawTransaction => ({
  id: `tx-${String(++nextId)}`,
  date: "2026-04-15",
  description: "Test merchant",
  amountBrl: 100,
  sourceFile: "test.pdf",
  bank: "nubank",
  ...overrides,
});
