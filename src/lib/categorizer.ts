import type { Category, RawTransaction, Transaction } from "@/types";

interface RuleContext {
  allTxs: readonly RawTransaction[];
  tsByTxId: ReadonlyMap<string, number>;
}

type Rule = (tx: RawTransaction, ctx: RuleContext) => Category | null;

const matchesPayment: Rule = (tx) =>
  /^pagamento\b/i.test(tx.description.trim()) ? "payment" : null;

const matchesRefund: Rule = (tx) =>
  /^(estorno\b|cr[eé]dito de pagamento|saldo restante)/i.test(tx.description.trim())
    ? "refund"
    : null;

const matchesIof: Rule = (tx) => (/\bIOF\b/i.test(tx.description) ? "iof" : null);

const matchesFees: Rule = (tx) =>
  /\b(anuidade|tarifa|juros)\b/i.test(tx.description) ? "fees" : null;

const matchesParserCurrency: Rule = (tx) =>
  tx.originalCurrency !== undefined && tx.originalCurrency !== "BRL" ? "international" : null;

const FOREIGN_CURRENCY_TOKENS = /\b(USD|EUR|GBP|JPY)\b|US\$/i;
const matchesCurrencyToken: Rule = (tx) =>
  FOREIGN_CURRENCY_TOKENS.test(tx.description) ? "international" : null;

const FOREIGN_COUNTRY_SUFFIX = /\s(US|UK|IE|NL|DE|FR|JP|CA)\s*$/i;
const matchesCountrySuffix: Rule = (tx) =>
  FOREIGN_COUNTRY_SUFFIX.test(tx.description) ? "international" : null;

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const matchesIofProximity: Rule = (tx, { allTxs, tsByTxId }) => {
  const txTime = tsByTxId.get(tx.id) ?? new Date(tx.date).getTime();
  const hasIofNeighbor = allTxs.some((other) => {
    if (other.id === tx.id) return false;
    if (!/\bIOF\b/i.test(other.description)) return false;
    const otherTime = tsByTxId.get(other.id) ?? new Date(other.date).getTime();
    return Math.abs(otherTime - txTime) <= TWO_DAYS_MS;
  });
  return hasIofNeighbor ? "international" : null;
};

const RULES: readonly Rule[] = [
  matchesPayment,
  matchesRefund,
  matchesIof,
  matchesFees,
  matchesParserCurrency,
  matchesCurrencyToken,
  matchesCountrySuffix,
  matchesIofProximity,
];

const buildTsCache = (txs: readonly RawTransaction[]): ReadonlyMap<string, number> => {
  const cache = new Map<string, number>();
  for (const tx of txs) cache.set(tx.id, new Date(tx.date).getTime());
  return cache;
};

/**
 * Categorize a single transaction using the priority chain.
 *
 * `allTxs` defaults to `[tx]` so single-call usage works without setup. With
 * the default, the IOF-proximity rule (rule 8) cannot match because there are
 * no siblings; rules 1-7 are unaffected. To enable rule 8, pass the full
 * batch. `categorizeBatch` does this automatically.
 */
export const categorize = (
  tx: RawTransaction,
  allTxs: readonly RawTransaction[] = [tx],
): Category => {
  const ctx: RuleContext = { allTxs, tsByTxId: buildTsCache(allTxs) };
  for (const rule of RULES) {
    const result = rule(tx, ctx);
    if (result !== null) return result;
  }
  return "domestic";
};

export const categorizeBatch = (txs: readonly RawTransaction[]): Transaction[] => {
  const ctx: RuleContext = { allTxs: txs, tsByTxId: buildTsCache(txs) };
  return txs.map((tx) => {
    for (const rule of RULES) {
      const result = rule(tx, ctx);
      if (result !== null) return { ...tx, category: result };
    }
    return { ...tx, category: "domestic" as const };
  });
};
