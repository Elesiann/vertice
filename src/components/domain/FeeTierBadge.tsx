import type { JSX } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { feeTier, type FeeTier } from "@/lib/fee-tier";

const FEE_TIER_LABEL: Record<FeeTier, string> = {
  free: "sem anuidade",
  lean: "anuidade enxuta",
  heavy: "anuidade pesa",
  conditional: "anuidade só compensa com uso",
};

const FEE_TIER_TONE: Record<FeeTier, "accent" | "neutral" | "warning"> = {
  free: "neutral",
  lean: "accent",
  heavy: "warning",
  conditional: "warning",
};

interface FeeTierBadgeProps {
  annualFeeBrl: number;
  yearOneNetValueBrl?: number;
  className?: string;
}

const resolveTier = ({ annualFeeBrl, yearOneNetValueBrl }: FeeTierBadgeProps): FeeTier | null => {
  if (annualFeeBrl === 0) return "free";
  if (yearOneNetValueBrl === undefined) return null;
  return feeTier(annualFeeBrl, yearOneNetValueBrl);
};

export const FeeTierBadge = (props: FeeTierBadgeProps): JSX.Element | null => {
  const tier = resolveTier(props);
  if (tier === null) return null;

  return (
    <Badge tone={FEE_TIER_TONE[tier]} className={cn("w-fit", props.className)}>
      {FEE_TIER_LABEL[tier]}
    </Badge>
  );
};
