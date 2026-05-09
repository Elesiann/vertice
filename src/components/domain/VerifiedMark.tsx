import type { JSX } from "react";
import { Badge } from "@/components/ui/Badge";
import type { CardVerifiedTier } from "@/types";

interface VerifiedMarkProps {
  lastVerified?: string;
  verifiedTier?: CardVerifiedTier;
  className?: string;
}

const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

const verifiedTone = (verifiedTier?: CardVerifiedTier): "accent" | "neutral" => {
  return verifiedTier === 1 ? "accent" : "neutral";
};

export const VerifiedMark = ({
  lastVerified,
  verifiedTier,
  className,
}: VerifiedMarkProps): JSX.Element | null => {
  if (lastVerified === undefined) return null;

  return (
    <Badge tone={verifiedTone(verifiedTier)} className={className}>
      Verificado em {DATE_FORMAT.format(new Date(lastVerified))}
    </Badge>
  );
};
