export const DEFAULT_PTAX_BRL_PER_USD = 5.6;

export const PTAX_LAST_VERIFIED = "2026-04-15";

export const getPtaxRate = (override?: number): number => override ?? DEFAULT_PTAX_BRL_PER_USD;
