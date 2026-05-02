import type { Bank, Category, Currency, Transaction } from "@/types";

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

type Rule = (tx: RawTransaction, allTxs: readonly RawTransaction[]) => Category | null;

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
const matchesIofProximity: Rule = (tx, allTxs) => {
  const txTime = new Date(tx.date).getTime();
  const hasIofNeighbor = allTxs.some(
    (other) =>
      other.id !== tx.id &&
      /\bIOF\b/i.test(other.description) &&
      Math.abs(new Date(other.date).getTime() - txTime) <= TWO_DAYS_MS,
  );
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

export const categorize = (
  tx: RawTransaction,
  allTxs: readonly RawTransaction[] = [tx],
): Category => {
  for (const rule of RULES) {
    const result = rule(tx, allTxs);
    if (result !== null) return result;
  }
  return "domestic";
};

export const categorizeBatch = (txs: readonly RawTransaction[]): Transaction[] =>
  txs.map((tx) => ({ ...tx, category: categorize(tx, txs) }));
