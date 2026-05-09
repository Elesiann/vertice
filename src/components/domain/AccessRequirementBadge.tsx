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

const RELATIONSHIP_SUFFIX: Partial<Record<RelationshipLevel, string>> = {
  private: " (private banking)",
  investment: " (na corretora do banco)",
  checking: " (com conta corrente ativa)",
};

// Sinaliza barreira de entrada do produto: investimento mínimo exigido
// e/ou relacionamento bancário. Diferente da `FeeWaiverBadge`, que mostra
// condições de isenção de anuidade — aqui a barreira é para *contratar*
// o cartão, não para zerar a tarifa.
//
// `requiredInvestmentBrl` no catálogo é ambíguo: para `requiresRelationship:
// "open"` ou `"checking"` ele significa "via alternativa de isenção" (já
// representada pela FeeWaiverBadge); só vira barreira real quando o
// relacionamento exige `"investment"` ou `"private"`.
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
    const suffix = RELATIONSHIP_SUFFIX[requiresRelationship] ?? "";
    return (
      <Badge tone="warning" className={cn("w-fit", className)}>
        Exige {formatBrl(investedBrl)} investido{suffix}
      </Badge>
    );
  }

  if (requiresRelationship === "private") {
    return (
      <Badge tone="warning" className={cn("w-fit", className)}>
        Exige relacionamento private banking
      </Badge>
    );
  }

  if (requiresRelationship === "checking") {
    return (
      <Badge tone="neutral" className={cn("w-fit", className)}>
        Exige conta corrente ativa
      </Badge>
    );
  }

  return null;
};
