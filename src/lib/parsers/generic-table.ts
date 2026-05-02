import type { Parser, ParserInput, RawParserResult } from "@/lib/parser";
import { parseBrAmount } from "@/lib/parsers/br-amount";
import type { PdfTextItem } from "@/lib/parsers/pdf-text";
import { ok, type Result } from "@/lib/result";
import type { ParseError, RawTransaction } from "@/types";

const Y_TOLERANCE = 2;

const DDMMYYYY_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const DDMMYY_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/;
const AMOUNT_PATTERN = /^[−-]?R?\$?\s*[\d.]+,\d{2}$/;

const groupItemsIntoRows = (items: readonly PdfTextItem[]): PdfTextItem[][] => {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (Math.abs(a.y - b.y) > Y_TOLERANCE) return b.y - a.y;
    return a.x - b.x;
  });

  const rows: PdfTextItem[][] = [];
  let currentRow: PdfTextItem[] = [];
  let rowAnchorY: number | null = null;
  let rowPage: number | null = null;

  for (const item of sorted) {
    const sameRow =
      rowPage === item.page && rowAnchorY !== null && Math.abs(item.y - rowAnchorY) <= Y_TOLERANCE;
    if (!sameRow) {
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [item];
      rowAnchorY = item.y;
      rowPage = item.page;
    } else {
      currentRow.push(item);
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);
  return rows;
};

const parseDate = (text: string): string | null => {
  const trimmed = text.trim();
  const ddmmyyyy = DDMMYYYY_PATTERN.exec(trimmed);
  if (ddmmyyyy?.[1] && ddmmyyyy[2] && ddmmyyyy[3]) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, "0")}-${ddmmyyyy[1].padStart(2, "0")}`;
  }
  const ddmmyy = DDMMYY_PATTERN.exec(trimmed);
  if (ddmmyy?.[1] && ddmmyy[2] && ddmmyy[3]) {
    const fullYear = `20${ddmmyy[3]}`;
    return `${fullYear}-${ddmmyy[2].padStart(2, "0")}-${ddmmyy[1].padStart(2, "0")}`;
  }
  return null;
};

const parseAmount = (text: string): number | null => {
  if (!AMOUNT_PATTERN.test(text.trim())) return null;
  return parseBrAmount(text);
};

const findRowDate = (row: readonly PdfTextItem[]): { date: string; index: number } | null => {
  for (let i = 0; i < row.length; i++) {
    const item = row[i];
    if (!item) continue;
    const date = parseDate(item.text);
    if (date) return { date, index: i };
  }
  return null;
};

const findRowAmount = (row: readonly PdfTextItem[]): { amount: number; index: number } | null => {
  for (let i = row.length - 1; i >= 0; i--) {
    const item = row[i];
    if (!item) continue;
    const amount = parseAmount(item.text);
    if (amount !== null) return { amount, index: i };
  }
  return null;
};

const buildDescription = (
  row: readonly PdfTextItem[],
  dateIndex: number,
  amountIndex: number,
): string =>
  row
    .filter((_, i) => i !== dateIndex && i !== amountIndex)
    .map((item) => item.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const extractTransactionsFromItems = (
  items: readonly PdfTextItem[],
  fileName: string,
): RawTransaction[] => {
  const rows = groupItemsIntoRows(items);
  const transactions: RawTransaction[] = [];
  for (const row of rows) {
    if (row.length < 3) continue;
    const dateMatch = findRowDate(row);
    const amountMatch = findRowAmount(row);
    if (!dateMatch || !amountMatch) continue;
    if (dateMatch.index === amountMatch.index) continue;
    const description = buildDescription(row, dateMatch.index, amountMatch.index);
    if (!description) continue;
    transactions.push({
      id: `generic-${dateMatch.date}-${description.slice(0, 20).replace(/\s+/g, "-")}-${String(transactions.length)}`,
      date: dateMatch.date,
      description,
      amountBrl: amountMatch.amount,
      sourceFile: fileName,
      bank: "unknown",
    });
  }
  return transactions;
};

const periodFromTransactions = (
  transactions: readonly RawTransaction[],
): { start: string; end: string } => {
  if (transactions.length === 0) return { start: "", end: "" };
  const dates = transactions.map((t) => t.date);
  return {
    start: dates.reduce((a, b) => (b < a ? b : a), dates[0] ?? ""),
    end: dates.reduce((a, b) => (b > a ? b : a), dates[0] ?? ""),
  };
};

export const genericTableParser: Parser = {
  bank: "unknown",
  parse: (input: ParserInput): Result<RawParserResult, ParseError> => {
    const items = input.items ?? [];
    const transactions = extractTransactionsFromItems(items, input.fileName);
    const warnings: string[] = [];
    if (items.length === 0) {
      warnings.push("Parser genérico recebeu zero items posicionais; nada a extrair.");
    } else if (transactions.length === 0) {
      warnings.push("Parser genérico não reconheceu linhas tabulares com data e valor.");
    } else {
      warnings.push(
        `Parser genérico extraiu ${String(transactions.length)} transações via clustering x/y; precisão menor que parsers bank-específicos.`,
      );
    }
    return ok({
      bank: "unknown",
      fileName: input.fileName,
      rawTransactions: transactions,
      detectedPeriod: periodFromTransactions(transactions),
      warnings,
      checksum: null,
    });
  },
};
