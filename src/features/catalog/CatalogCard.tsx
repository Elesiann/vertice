import type { JSX, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardArt } from "@/components/domain/CardArt";
import { VerifiedMark } from "@/components/domain/VerifiedMark";
import { useSession } from "@/context/SessionContext";
import { formatBrl, formatCashbackRate } from "@/lib/format";
import { formatBankLabel } from "@/lib/labels";
import type { CardVerifiedTier, PublicCatalogCard, RelationshipLevel } from "@/types";

type CatalogCardWithVerification = PublicCatalogCard & {
  lastVerified?: string;
  verifiedTier?: CardVerifiedTier;
};

interface CatalogCardProps {
  card: CatalogCardWithVerification;
  onCompare?: (id: string) => void;
  inCompare?: boolean;
  className?: string;
}

const RELATIONSHIP_SOURCE: Partial<Record<RelationshipLevel, string>> = {
  private: " (private banking)",
  investment: " na corretora do emissor",
  checking: " na conta do emissor",
};

// Linha "Isenção": condições que zeram a anuidade real. Texto corrido, sem
// badge — pode ser longo ("Gasto de R$ 5.000,00/mês ou R$ 50.000,00 investidos").
const waiverText = (card: PublicCatalogCard): string | null => {
  const parts: string[] = [];
  if (card.annualFeeWaiverThresholdBrl !== undefined) {
    parts.push(`gasto de ${formatBrl(card.annualFeeWaiverThresholdBrl)}/mês`);
  }
  if (card.investmentFeeWaiverBrl !== undefined) {
    parts.push(`${formatBrl(card.investmentFeeWaiverBrl)} investidos`);
  }
  if (parts.length === 0) return null;
  const joined = parts.join(" ou ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
};

// Linha "Acesso": barreira para *contratar* o cartão. `isBarrier` pinta o
// valor em âmbar (exigência de investimento/private); conta corrente é fato
// neutro. Espelha a lógica de `AccessRequirementBadge`.
const accessLine = (card: PublicCatalogCard): { text: string; isBarrier: boolean } | null => {
  const invested = card.requiredInvestmentBrl ?? card.minInvestmentBrl;
  const rel = card.requiresRelationship;
  const isInvestmentBarrier = rel === "investment" || rel === "private";

  if (isInvestmentBarrier && invested !== undefined && invested > 0) {
    return {
      text: `${formatBrl(invested)} investidos${RELATIONSHIP_SOURCE[rel] ?? ""}`,
      isBarrier: true,
    };
  }
  if (rel === "private") return { text: "private banking", isBarrier: true };
  if (rel === "checking") return { text: "conta corrente no emissor", isBarrier: false };
  return null;
};

interface CardRowProps {
  label: string;
  children: ReactNode;
  inline?: boolean;
  valueClassName?: string;
}

// Inline: label e valor na mesma linha (anuidade — valor curto).
// Empilhado: label como caption em cima, valor corrido embaixo (isenção,
// acesso — valor pode quebrar).
const CardRow = ({ label, children, inline = false, valueClassName }: CardRowProps): JSX.Element =>
  inline ? (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-muted text-body-sm">{label}</dt>
      <dd className={cn("text-body-sm", valueClassName)}>{children}</dd>
    </div>
  ) : (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-ink-subtle">{label}</dt>
      <dd className={cn("text-body-sm leading-snug", valueClassName)}>{children}</dd>
    </div>
  );

export const CatalogCard = ({
  card,
  onCompare,
  inCompare = false,
  className,
}: CatalogCardProps): JSX.Element => {
  const navigate = useNavigate();
  const { profile } = useSession();
  const isCurrentCard = profile?.currentCardIds?.includes(card.id) === true;

  const handleCompare = (): void => {
    const currentCardId = profile?.currentCardIds?.[0];
    if (currentCardId !== undefined) {
      const ids = currentCardId === card.id ? [currentCardId] : [currentCardId, card.id];
      void navigate(`/compare?ids=${ids.join(",")}`);
      return;
    }
    onCompare?.(card.id);
  };

  const waiver = waiverText(card);
  const access = accessLine(card);
  const hasCashback = card.cashbackRatePercent !== undefined && card.cashbackRatePercent > 0;
  const hasChips = isCurrentCard || card.hasLoungeAccess || hasCashback;

  return (
    <article
      className={cn(
        "border-line bg-surface-raised group flex flex-col gap-3 rounded-xl border p-4 transition-shadow hover:shadow-md",
        className,
      )}
    >
      <Link
        to={`/cards/${card.id}`}
        className="focus-visible:ring-accent block rounded-lg focus:outline-none focus-visible:ring-2"
      >
        <CardArt
          brand={card.brand}
          tier={card.tier}
          bank={card.bank}
          size="sm"
          className="w-full"
        />
      </Link>

      <div className="flex flex-col gap-1">
        <Link
          to={`/cards/${card.id}`}
          className="text-heading text-ink hover:text-accent focus-visible:ring-accent rounded focus:outline-none focus-visible:ring-2"
        >
          {card.name}
        </Link>
        <p className="text-caption text-ink-subtle">
          {formatBankLabel(card.bank, card.id)} · {card.tier}
        </p>
        <VerifiedMark
          {...(card.lastVerified !== undefined ? { lastVerified: card.lastVerified } : {})}
          {...(card.verifiedTier !== undefined ? { verifiedTier: card.verifiedTier } : {})}
        />
      </div>

      <dl className="flex flex-col gap-2">
        <CardRow label="Anuidade" inline valueClassName="text-ink tabular font-semibold">
          {formatBrl(card.annualFeeBrl)}
        </CardRow>
        {waiver !== null && (
          <CardRow label="Isenção" valueClassName="text-ink-subtle">
            {waiver}
          </CardRow>
        )}
        {access !== null && (
          <CardRow
            label="Acesso"
            valueClassName={access.isBarrier ? "text-warning" : "text-ink-subtle"}
          >
            {access.text}
          </CardRow>
        )}
      </dl>

      {hasChips && (
        <div className="flex flex-wrap gap-1">
          {isCurrentCard && <Badge tone="neutral">Você já tem</Badge>}
          {card.hasLoungeAccess && <Badge tone="neutral">Lounge</Badge>}
          {hasCashback && card.cashbackRatePercent !== undefined && (
            <Badge tone="neutral">
              {card.hasInvestback === true ? "Investback" : "Cashback"}{" "}
              {formatCashbackRate(card.cashbackRatePercent)}
            </Badge>
          )}
        </div>
      )}

      {/* Comparar: ação discreta. No desktop aparece no hover/foco do card;
          no mobile (sem hover) fica sempre visível; se já está na comparação,
          sempre visível para permitir remover. opacity (não hidden) mantém o
          botão na ordem de tabulação. */}
      <div
        className={cn(
          "mt-auto transition-opacity",
          !inCompare && "sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100",
        )}
      >
        <Button
          className="w-full"
          size="sm"
          variant={inCompare ? "secondary" : "ghost"}
          onClick={handleCompare}
        >
          {inCompare ? "Na comparação" : "Comparar"}
        </Button>
      </div>
    </article>
  );
};
