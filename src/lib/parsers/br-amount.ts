/**
 * Parses a Brazilian-formatted currency amount.
 *
 * Handles thousand separators (`.`), decimal commas (`,`), optional
 * `R$` prefix, and both ASCII (`-`) and Unicode (`−` U+2212) minus
 * signs. Returns null when the input has no digits or the result is
 * NaN, so callers can ignore lines that don't contain an amount.
 *
 * Examples:
 *   "R$ 1.857,72"  → 1857.72
 *   "−R$ 41,37"    → -41.37
 *   "R$ 0,01"      → 0.01
 *   ""             → null
 */
export const parseBrAmount = (text: string): number | null => {
  const isNegative = /[−-]/.test(text);
  const normalized = text
    .replace(/[^0-9.,]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  if (Number.isNaN(value)) return null;
  return isNegative ? -value : value;
};
