import type { JSX } from "react";
import { cn } from "@/lib/cn";
import { formatBrl } from "@/lib/format";

interface FeeWaiverBadgeProps {
  annualFeeWaiverThresholdBrl?: number;
  investmentFeeWaiverBrl?: number;
  className?: string;
}

export const FeeWaiverBadge = ({
  annualFeeWaiverThresholdBrl,
  investmentFeeWaiverBrl,
  className,
}: FeeWaiverBadgeProps): JSX.Element | null => {
  const spend = annualFeeWaiverThresholdBrl;
  const invest = investmentFeeWaiverBrl;

  if (spend === undefined && invest === undefined) return null;

  const parts: string[] = ["Isenta:"];

  if (spend !== undefined) {
    parts.push(`${formatBrl(spend)}/mês`);
  }

  if (spend !== undefined && invest !== undefined) {
    parts.push("ou");
  }

  if (invest !== undefined) {
    parts.push(`${formatBrl(invest)} investido`);
  }

  return <span className={cn("text-ink-muted text-xs", className)}>{parts.join(" ")}</span>;
};
