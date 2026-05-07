export const DEFAULT_PTAX_BRL_PER_USD = 4.95;

export const PTAX_LAST_VERIFIED = "2026-05-07";

export const getPtaxRate = (override?: number): number => override ?? DEFAULT_PTAX_BRL_PER_USD;
