import { PDFDocument, StandardFonts } from "pdf-lib";
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

export const buildSyntheticPdf = async (lines: readonly string[]): Promise<ArrayBuffer> => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 700]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let cursorY = 660;
  for (const line of lines) {
    page.drawText(line, { x: 30, y: cursorY, size: 12, font });
    cursorY -= 20;
  }
  const bytes = await pdf.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};
