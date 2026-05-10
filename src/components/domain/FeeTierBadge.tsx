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

// Quando o fee modelado é 0 mas o cartão tem anuidade real isentada por
// um waiver condicional (gasto mensal ou investimento), passar `waived`
// muda o texto de "sem anuidade" → "isenta pelo gasto"/"isenta pelo
// investimento" e o tom para `warning`, sinalizando a condicionalidade.
type WaiverHint = "spend" | "investment";

interface FeeTierBadgeProps {
  annualFeeBrl: number;
  yearOneNetValueBrl?: number;
  waived?: boolean;
  waiverHint?: WaiverHint;
  className?: string;
}

const WAIVED_LABEL: Record<WaiverHint, string> = {
  spend: "anuidade isenta pelo gasto",
  investment: "anuidade isenta pelo investimento",
};

const resolveTier = ({ annualFeeBrl, yearOneNetValueBrl }: FeeTierBadgeProps): FeeTier | null => {
  if (annualFeeBrl === 0) return "free";
  if (yearOneNetValueBrl === undefined) return null;
  return feeTier(annualFeeBrl, yearOneNetValueBrl);
};

export const FeeTierBadge = (props: FeeTierBadgeProps): JSX.Element | null => {
  const tier = resolveTier(props);
  if (tier === null) return null;

  if (tier === "free" && props.waived === true) {
    const label =
      props.waiverHint !== undefined ? WAIVED_LABEL[props.waiverHint] : "anuidade isenta";
    return (
      <Badge tone="warning" className={cn("w-fit", props.className)}>
        {label}
      </Badge>
    );
  }

  return (
    <Badge tone={FEE_TIER_TONE[tier]} className={cn("w-fit", props.className)}>
      {FEE_TIER_LABEL[tier]}
    </Badge>
  );
};
