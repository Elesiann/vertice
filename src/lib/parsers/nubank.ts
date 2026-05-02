import type { Parser, ParserInput, RawParserResult } from "@/lib/parser";
import { parseBrAmount } from "@/lib/parsers/br-amount";
import { fail, ok, type Result } from "@/lib/result";
import type { ParseError, RawTransaction } from "@/types";

const MONTH_TO_NUMBER: Readonly<Record<string, number>> = {
  JAN: 1,
  FEV: 2,
  MAR: 3,
  ABR: 4,
  MAI: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  SET: 9,
  OUT: 10,
  NOV: 11,
  DEZ: 12,
};

const TX_LINE_PATTERN =
  /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(?:•{4}\s+(\d{4})\s+)?(.+?)\s+(−?-?R\$\s*[\d.,]+)$/i;
const STATEMENT_YEAR_PATTERN =
  /FATURA\s+\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})/i;
const PERIOD_PATTERN = /Per[ií]odo vigente:\s*(\d{2})\s+(\w{3})\s+a\s+(\d{2})\s+(\w{3})/i;
const TOTAL_TO_PAY_PATTERN = /Total a pagar\s+R\$\s*([\d.,]+)/i;

const padTwo = (n: number): string => String(n).padStart(2, "0");

const toIsoDate = (year: number, month: number, day: number): string =>
  `${String(year)}-${padTwo(month)}-${padTwo(day)}`;

interface ResolvedPeriod {
  startMonth: number;
  startDay: number;
  startYear: number;
  endMonth: number;
  endDay: number;
  endYear: number;
}

const resolvePeriod = (text: string, statementYear: number): ResolvedPeriod | null => {
  const match = PERIOD_PATTERN.exec(text);
  if (!match) return null;
  const [, startDayStr, startMonthAbbr, endDayStr, endMonthAbbr] = match;
  if (!startDayStr || !startMonthAbbr || !endDayStr || !endMonthAbbr) return null;
  const startMonth = MONTH_TO_NUMBER[startMonthAbbr.toUpperCase()];
  const endMonth = MONTH_TO_NUMBER[endMonthAbbr.toUpperCase()];
  if (startMonth === undefined || endMonth === undefined) return null;

  const endYear = statementYear;
  const startYear = startMonth > endMonth ? endYear - 1 : endYear;

  return {
    startMonth,
    startDay: Number(startDayStr),
    startYear,
    endMonth,
    endDay: Number(endDayStr),
    endYear,
  };
};

const yearForTxMonth = (txMonth: number, period: ResolvedPeriod): number => {
  if (period.startYear === period.endYear) return period.startYear;
  return txMonth >= period.startMonth ? period.startYear : period.endYear;
};

const buildTxId = (date: string, description: string, amountBrl: number, index: number): string =>
  `nubank-${date}-${description.slice(0, 20).replace(/\s+/g, "-")}-${amountBrl.toFixed(2)}-${String(index)}`;

const extractTransactions = (
  rawText: string,
  period: ResolvedPeriod,
  fileName: string,
): RawTransaction[] => {
  const transactions: RawTransaction[] = [];
  const lines = rawText.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = TX_LINE_PATTERN.exec(trimmed);
    if (!match) continue;
    const [, dayStr, monthAbbr, , description, amountStr] = match;
    if (!dayStr || !monthAbbr || !description || !amountStr) continue;
    const month = MONTH_TO_NUMBER[monthAbbr.toUpperCase()];
    if (month === undefined) continue;
    const amountBrl = parseBrAmount(amountStr);
    if (amountBrl === null) continue;
    const day = Number(dayStr);
    const year = yearForTxMonth(month, period);
    const date = toIsoDate(year, month, day);
    const trimmedDescription = description.trim();
    transactions.push({
      id: buildTxId(date, trimmedDescription, amountBrl, transactions.length),
      date,
      description: trimmedDescription,
      amountBrl,
      sourceFile: fileName,
      bank: "nubank",
    });
  }
  return transactions;
};

const layoutError = (message: string, fileName: string): ParseError => ({
  code: "UNSUPPORTED_BANK_LAYOUT",
  message,
  fileName,
});

export const nubankParser: Parser = {
  bank: "nubank",
  parse: (input: ParserInput): Result<RawParserResult, ParseError> => {
    const { rawText, fileName } = input;

    const yearMatch = STATEMENT_YEAR_PATTERN.exec(rawText);
    if (!yearMatch?.[1]) {
      return fail(layoutError("Não consegui identificar o ano da fatura Nubank.", fileName));
    }
    const statementYear = Number(yearMatch[1]);

    const period = resolvePeriod(rawText, statementYear);
    if (!period) {
      return fail(layoutError("Não consegui identificar o período da fatura Nubank.", fileName));
    }

    const totalMatch = TOTAL_TO_PAY_PATTERN.exec(rawText);
    const checksum = totalMatch?.[1] ? parseBrAmount(totalMatch[1]) : null;

    const rawTransactions = extractTransactions(rawText, period, fileName);
    const warnings: string[] = [];
    if (rawTransactions.length === 0) {
      warnings.push("Nenhuma linha de transação reconhecida no padrão Nubank.");
    }

    return ok({
      bank: "nubank",
      fileName,
      rawTransactions,
      detectedPeriod: {
        start: toIsoDate(period.startYear, period.startMonth, period.startDay),
        end: toIsoDate(period.endYear, period.endMonth, period.endDay),
      },
      warnings,
      checksum,
    });
  },
};
