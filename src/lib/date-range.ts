import type { DateRange } from "@/types";

const EMPTY_RANGE: DateRange = { start: "", end: "" };

/**
 * Returns the min and max ISO date in a single pass.
 *
 * Operates on lexicographically comparable strings (ISO yyyy-mm-dd
 * sorts the same as chronological order). Returns empty-string sentinels
 * for an empty input — `aggregator.ts` and `generic-table.ts` both treat
 * that as the "no data" signal.
 */
export const dateRangeOf = (dates: readonly string[]): DateRange => {
  const first = dates[0];
  if (first === undefined) return EMPTY_RANGE;
  let min = first;
  let max = first;
  for (let i = 1; i < dates.length; i++) {
    const d = dates[i];
    if (d === undefined) continue;
    if (d < min) min = d;
    else if (d > max) max = d;
  }
  return { start: min, end: max };
};
