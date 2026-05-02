export type Currency = "BRL" | "USD" | "EUR" | "OTHER";

export type Bank = "nubank" | "itau" | "bradesco" | "unknown";

export type Category = "domestic" | "international" | "iof" | "fees" | "payment" | "refund";

export interface RawTransaction {
  id: string;
  date: string;
  description: string;
  amountBrl: number;
  originalCurrency?: Currency;
  originalAmount?: number;
  sourceFile: string;
  bank: Bank;
}

export interface Transaction extends RawTransaction {
  category: Category;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface SpendingAggregate {
  periodStart: string;
  periodEnd: string;
  monthsCovered: number;
  totalDomesticBrl: number;
  totalInternationalUsd: number;
  totalInternationalBrl: number;
  monthlyAvgDomesticBrl: number;
  monthlyAvgInternationalUsd: number;
  ptaxRateUsed: number;
  transactionCount: number;
  duplicatesRemoved: number;
  byBank: Partial<Record<Bank, number>>;
}

export type ParseErrorCode =
  | "UNSUPPORTED_BANK"
  | "UNSUPPORTED_BANK_LAYOUT"
  | "PASSWORD_PROTECTED"
  | "CORRUPT_PDF"
  | "EMPTY_PDF"
  | "DETECTION_FAILED"
  | "PARSER_THREW"
  | "TIMEOUT"
  | "CHECKSUM_MISMATCH"
  | "ALL_LAYERS_FAILED";

export interface ParseError {
  code: ParseErrorCode;
  message: string;
  detail?: string;
  fileName: string;
}

export type ParserLayer = "bank-specific" | "generic-table" | "manual-entry";

export interface ParserResult {
  bank: Bank;
  fileName: string;
  transactions: Transaction[];
  detectedPeriod: DateRange;
  warnings: string[];
  checksum: number | null;
  layoutFingerprint: string | null;
  layerUsed: ParserLayer;
}

export type ParseProgressPhase = "extracting" | "detecting" | "parsing" | "categorizing";

export type ParseStatus =
  | { kind: "pending" }
  | { kind: "parsing"; phase: ParseProgressPhase; pct: number }
  | { kind: "success"; result: ParserResult }
  | { kind: "error"; error: ParseError };

export interface UploadFileState {
  id: string;
  fileName: string;
  sizeBytes: number;
  status: ParseStatus;
}
