import type { JSX } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { WaiverIcon } from "@/components/domain/WaiverIcon";
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
  if (annualFeeWaiverThresholdBrl === undefined && investmentFeeWaiverBrl === undefined) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {annualFeeWaiverThresholdBrl !== undefined && (
        <Badge tone="neutral" className="inline-flex items-center gap-1.5">
          <WaiverIcon category="monthly_spend" />
          Gasto {formatBrl(annualFeeWaiverThresholdBrl)}/mês
        </Badge>
      )}
      {annualFeeWaiverThresholdBrl !== undefined && investmentFeeWaiverBrl !== undefined && (
        <span className="text-ink-subtle text-xs font-medium">OU</span>
      )}
      {investmentFeeWaiverBrl !== undefined && (
        <Badge tone="neutral" className="inline-flex items-center gap-1.5">
          <WaiverIcon category="investment" />
          {formatBrl(investmentFeeWaiverBrl)} investido
        </Badge>
      )}
    </div>
  );
};
