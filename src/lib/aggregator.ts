import { dateRangeOf } from "@/lib/date-range";
import { getPtaxRate } from "@/lib/ptax";
import type { Bank, Category, DateRange, SpendingAggregate, Transaction } from "@/types";

/**
 * Customize aggregation. ptaxRate overrides the configured default
 * (ADR-0005); periodOverride clamps totals to a user-edited window
 * from the review screen.
 */
export interface AggregateOptions {
  ptaxRate?: number;
  periodOverride?: DateRange;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_AVG_MONTH = MS_PER_DAY * 30.4375;
const SIXTY_DAYS_MS = 60 * MS_PER_DAY;

type SpendCategory = Extract<Category, "domestic" | "international">;

const isSpending = (category: Category): category is SpendCategory =>
  category === "domestic" || category === "international";

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

const buildTsCache = (txs: readonly Transaction[]): ReadonlyMap<string, number> => {
  const cache = new Map<string, number>();
  for (const tx of txs) cache.set(tx.id, new Date(tx.date).getTime());
  return cache;
};

const inferRefundOriginalCategory = (
  refund: Transaction,
  others: readonly Transaction[],
  tsByTxId: ReadonlyMap<string, number>,
): SpendCategory => {
  const refundTime = tsByTxId.get(refund.id) ?? new Date(refund.date).getTime();
  const refundAmount = Math.abs(refund.amountBrl);
  const match = others.find((other) => {
    if (other.id === refund.id) return false;
    if (!isSpending(other.category)) return false;
    if (Math.abs(Math.abs(other.amountBrl) - refundAmount) >= 0.01) return false;
    const otherTime = tsByTxId.get(other.id) ?? new Date(other.date).getTime();
    return Math.abs(otherTime - refundTime) <= SIXTY_DAYS_MS;
  });
  return match?.category === "international" ? "international" : "domestic";
};

const computePeriod = (txs: readonly Transaction[], override: DateRange | undefined): DateRange => {
  if (override) return override;
  const spendDates = txs
    .filter((tx) => tx.category !== "payment" && tx.category !== "refund")
    .map((tx) => tx.date);
  const dates = spendDates.length > 0 ? spendDates : txs.map((tx) => tx.date);
  return dateRangeOf(dates);
};

interface TotalsAccumulator {
  totalDomesticBrl: number;
  totalInternationalBrl: number;
  byBank: Partial<Record<Bank, number>>;
}

interface AccumulationContext {
  allTxs: readonly Transaction[];
  tsByTxId: ReadonlyMap<string, number>;
  inRange: (date: string) => boolean;
}

const targetCategoryFor = (tx: Transaction, ctx: AccumulationContext): SpendCategory | null => {
  if (tx.category === "refund") {
    return inferRefundOriginalCategory(tx, ctx.allTxs, ctx.tsByTxId);
  }
  if (!isSpending(tx.category)) return null;
  return ctx.inRange(tx.date) ? tx.category : null;
};

const accumulateTotals = (ctx: AccumulationContext): TotalsAccumulator => {
  const acc: TotalsAccumulator = {
    totalDomesticBrl: 0,
    totalInternationalBrl: 0,
    byBank: {},
  };

  for (const tx of ctx.allTxs) {
    const targetCategory = targetCategoryFor(tx, ctx);

    if (targetCategory === "domestic") {
      acc.totalDomesticBrl += tx.amountBrl;
    } else if (targetCategory === "international") {
      acc.totalInternationalBrl += tx.amountBrl;
    }

    if (isSpending(tx.category) && ctx.inRange(tx.date)) {
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
  const tsByTxId = buildTsCache(unique);
  const period = computePeriod(unique, options.periodOverride);
  const inRange = (date: string): boolean => date >= period.start && date <= period.end;

  const { totalDomesticBrl, totalInternationalBrl, byBank } = accumulateTotals({
    allTxs: unique,
    tsByTxId,
    inRange,
  });

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
