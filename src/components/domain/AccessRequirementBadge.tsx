import type { JSX } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatBrl } from "@/lib/format";
import type { RelationshipLevel } from "@/types";

interface AccessRequirementBadgeProps {
  requiredInvestmentBrl?: number;
  minInvestmentBrl?: number;
  requiresRelationship?: RelationshipLevel;
  className?: string;
}

const RELATIONSHIP_SOURCE: Partial<Record<RelationshipLevel, string>> = {
  private: " (private banking)",
  investment: " na corretora do emissor",
  checking: " na conta do emissor",
};

// Barreira para *contratar* o cartão. Sempre lê "Acesso: …" para não
// se confundir com isenção de anuidade (que pode ter outras chaves de
// gatilho como gasto mensal). `requiredInvestmentBrl` só vira barreira
// real quando o relacionamento exige `"investment"` ou `"private"`.
export const AccessRequirementBadge = ({
  requiredInvestmentBrl,
  minInvestmentBrl,
  requiresRelationship,
  className,
}: AccessRequirementBadgeProps): JSX.Element | null => {
  const investedBrl = requiredInvestmentBrl ?? minInvestmentBrl;
  const isInvestmentBarrier =
    requiresRelationship === "investment" || requiresRelationship === "private";

  if (isInvestmentBarrier && investedBrl !== undefined && investedBrl > 0) {
    const source = RELATIONSHIP_SOURCE[requiresRelationship] ?? "";
    return (
      <Badge tone="warning" className={cn("w-fit", className)}>
        Acesso: {formatBrl(investedBrl)} investidos{source}
      </Badge>
    );
  }

  if (requiresRelationship === "private") {
    return (
      <Badge tone="warning" className={cn("w-fit", className)}>
        Acesso: private banking
      </Badge>
    );
  }

  if (requiresRelationship === "checking") {
    return (
      <Badge tone="neutral" className={cn("w-fit", className)}>
        Acesso: conta corrente no emissor
      </Badge>
    );
  }

  return null;
};
