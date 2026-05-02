import { getPtaxRate } from "@/lib/ptax";
import type { Bank, Category, DateRange, SpendingAggregate, Transaction } from "@/types";

export interface AggregateOptions {
  ptaxRate?: number;
  periodOverride?: DateRange;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_AVG_MONTH = MS_PER_DAY * 30.4375;
const SIXTY_DAYS_MS = 60 * MS_PER_DAY;

const dedupKey = (tx: Transaction): string =>
  `${tx.date}|${tx.description}|${tx.amountBrl.toFixed(2)}|${tx.bank}`;

const dedupTransactions = (
  txs: readonly Transaction[],
): { unique: Transaction[]; duplicatesRemoved: number } => {
  const seen = new Map<string, Transaction>();
  for (const tx of txs) {
    const key = dedupKey(tx);
    if (!seen.has(key)) seen.set(key, tx);
  }
  return {
    unique: [...seen.values()],
    duplicatesRemoved: txs.length - seen.size,
  };
};

type SpendCategory = Extract<Category, "domestic" | "international">;

const inferRefundOriginalCategory = (
  refund: Transaction,
  others: readonly Transaction[],
): SpendCategory => {
  const refundTime = new Date(refund.date).getTime();
  const refundAmount = Math.abs(refund.amountBrl);
  const match = others.find(
    (other) =>
      other.id !== refund.id &&
      (other.category === "domestic" || other.category === "international") &&
      Math.abs(Math.abs(other.amountBrl) - refundAmount) < 0.01 &&
      Math.abs(new Date(other.date).getTime() - refundTime) <= SIXTY_DAYS_MS,
  );
  return match?.category === "international" ? "international" : "domestic";
};

const computePeriod = (txs: readonly Transaction[], override: DateRange | undefined): DateRange => {
  if (override) return override;
  const spendDates = txs
    .filter((tx) => tx.category !== "payment" && tx.category !== "refund")
    .map((tx) => tx.date);
  const dates = spendDates.length > 0 ? spendDates : txs.map((tx) => tx.date);
  return {
    start: dates.reduce((acc, d) => (d < acc ? d : acc), dates[0] ?? ""),
    end: dates.reduce((acc, d) => (d > acc ? d : acc), dates[0] ?? ""),
  };
};

interface TotalsAccumulator {
  totalDomesticBrl: number;
  totalInternationalBrl: number;
  byBank: Partial<Record<Bank, number>>;
}

const targetCategoryFor = (
  tx: Transaction,
  allTxs: readonly Transaction[],
  inRange: (date: string) => boolean,
): SpendCategory | null => {
  if (tx.category === "domestic" || tx.category === "international") {
    return inRange(tx.date) ? tx.category : null;
  }
  if (tx.category === "refund") {
    return inferRefundOriginalCategory(tx, allTxs);
  }
  return null;
};

const accumulateTotals = (
  txs: readonly Transaction[],
  inRange: (date: string) => boolean,
): TotalsAccumulator => {
  const acc: TotalsAccumulator = {
    totalDomesticBrl: 0,
    totalInternationalBrl: 0,
    byBank: {},
  };

  for (const tx of txs) {
    const targetCategory = targetCategoryFor(tx, txs, inRange);

    if (targetCategory === "domestic") {
      acc.totalDomesticBrl += tx.amountBrl;
    } else if (targetCategory === "international") {
      acc.totalInternationalBrl += tx.amountBrl;
    }

    if ((tx.category === "domestic" || tx.category === "international") && inRange(tx.date)) {
      acc.byBank[tx.bank] = (acc.byBank[tx.bank] ?? 0) + tx.amountBrl;
    }
  }

  return acc;
};

const monthsBetween = (startIso: string, endIso: string): number => {
  if (!startIso || !endIso) return 0;
  const span = new Date(endIso).getTime() - new Date(startIso).getTime();
  return span / MS_PER_AVG_MONTH;
};

const safeDivide = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator;

// Empty period strings are the "no data" sentinel: the aggregate type
// keeps periodStart/periodEnd as required strings, and consumers gate on
// truthiness (`if (!aggregate.periodStart) showEmptyState()`). This keeps
// the type narrow without a nullable union.
const emptyAggregate = (ptaxRateUsed: number): SpendingAggregate => ({
  periodStart: "",
  periodEnd: "",
  monthsCovered: 0,
  totalDomesticBrl: 0,
  totalInternationalBrl: 0,
  totalInternationalUsd: 0,
  monthlyAvgDomesticBrl: 0,
  monthlyAvgInternationalUsd: 0,
  ptaxRateUsed,
  transactionCount: 0,
  duplicatesRemoved: 0,
  byBank: {},
});

export const aggregate = (
  txs: readonly Transaction[],
  options: AggregateOptions = {},
): SpendingAggregate => {
  const ptaxRateUsed = getPtaxRate(options.ptaxRate);
  if (txs.length === 0) return emptyAggregate(ptaxRateUsed);

  const { unique, duplicatesRemoved } = dedupTransactions(txs);
  const period = computePeriod(unique, options.periodOverride);
  const inRange = (date: string): boolean => date >= period.start && date <= period.end;

  const { totalDomesticBrl, totalInternationalBrl, byBank } = accumulateTotals(unique, inRange);

  const monthsCovered = monthsBetween(period.start, period.end);
  const totalInternationalUsd = safeDivide(totalInternationalBrl, ptaxRateUsed);

  return {
    periodStart: period.start,
    periodEnd: period.end,
    monthsCovered,
    totalDomesticBrl,
    totalInternationalBrl,
    totalInternationalUsd,
    monthlyAvgDomesticBrl: safeDivide(totalDomesticBrl, monthsCovered),
    monthlyAvgInternationalUsd: safeDivide(totalInternationalUsd, monthsCovered),
    ptaxRateUsed,
    transactionCount: unique.length,
    duplicatesRemoved,
    byBank,
  };
};
