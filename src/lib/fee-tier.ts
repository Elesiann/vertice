export type FeeTier = "free" | "lean" | "heavy" | "conditional";

export const FEE_TIER_LEAN_THRESHOLD = 0.15;
export const FEE_TIER_HEAVY_THRESHOLD = 0.4;

export const feeTier = (annualFeeBrl: number, yearOneNetValueBrl: number): FeeTier => {
  if (annualFeeBrl === 0) return "free";
  if (yearOneNetValueBrl <= 0) return "conditional";

  const feeToNet = annualFeeBrl / yearOneNetValueBrl;
  if (feeToNet <= FEE_TIER_LEAN_THRESHOLD) return "lean";
  if (feeToNet <= FEE_TIER_HEAVY_THRESHOLD) return "heavy";
  return "conditional";
};
