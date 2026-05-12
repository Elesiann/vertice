import type { JSX } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Armchair,
  Check,
  Globe,
  Lock,
  type LucideIcon,
  PiggyBank,
  Plane,
  Plus,
  Percent,
  Umbrella,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { CardArt } from "@/components/domain/CardArt";
import { VerifiedMark } from "@/components/domain/VerifiedMark";
import { useSession } from "@/context/SessionContext";
import { formatCashbackRate } from "@/lib/format";
import { formatBankLabel, formatPointsProgram } from "@/lib/labels";
import type { CardVerifiedTier, PublicCatalogCard } from "@/types";

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

// Valores grandes ficam mais escaneáveis abreviados: "R$ 50 mil" em vez de
// "R$ 50.000,00". Centavos fora; só usa "mil" para múltiplos exatos de mil.
const formatBrlShort = (value: number): string => {
  if (value >= 1000 && value % 1000 === 0) return `R$ ${String(value / 1000)} mil`;
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
};

interface AnnualFee {
  headline: string;
  caption: string | null;
}

const annualFee = (card: PublicCatalogCard): AnnualFee => {
  if (card.annualFeeBrl === 0) return { headline: "Sem anuidade", caption: null };

  const conditions: string[] = [];
  if (card.annualFeeWaiverThresholdBrl !== undefined) {
    conditions.push(`gasto de ${formatBrlShort(card.annualFeeWaiverThresholdBrl)}/mês`);
  }
  if (card.investmentFeeWaiverBrl !== undefined) {
    conditions.push(`${formatBrlShort(card.investmentFeeWaiverBrl)} investidos`);
  }
  return {
    headline: `${formatBrlShort(card.annualFeeBrl)}/ano`,
    caption: conditions.length > 0 ? `isenta com ${conditions.join(" ou ")}` : null,
  };
};

interface AccessBarrier {
  text: string;
  tone: "warning" | "muted";
}

// Barreira para *contratar* o cartão (≠ isenção de anuidade). Exigência de
// investimento ou private banking conta como obstáculo (âmbar); conta corrente
// é só um pré-requisito leve (neutro). Espelha AccessRequirementBadge.
const accessBarrier = (card: PublicCatalogCard): AccessBarrier | null => {
  const invested = card.requiredInvestmentBrl ?? card.minInvestmentBrl;
  const rel = card.requiresRelationship;

  if ((rel === "investment" || rel === "private") && invested !== undefined && invested > 0) {
    const where = rel === "private" ? "em private banking" : "investidos na corretora do emissor";
    return { text: `Exige ${formatBrlShort(invested)} ${where}`, tone: "warning" };
  }
  if (rel === "private") return { text: "Exige private banking", tone: "warning" };
  if (rel === "checking") return { text: "Precisa de conta corrente no emissor", tone: "muted" };
  return null;
};

interface Perk {
  Icon: LucideIcon;
  label: string;
}

const perks = (card: PublicCatalogCard): Perk[] => {
  const list: Perk[] = [];
  if (card.hasLoungeAccess) list.push({ Icon: Armchair, label: "Sala VIP" });
  if (card.cashbackRatePercent !== undefined && card.cashbackRatePercent > 0) {
    const rate = formatCashbackRate(card.cashbackRatePercent);
    list.push(
      card.hasInvestback === true
        ? { Icon: PiggyBank, label: `Investback ${rate}` }
        : { Icon: Percent, label: `Cashback ${rate}` },
    );
  }
  if (card.pointsProgram !== "cashback") {
    list.push({ Icon: Plane, label: formatPointsProgram(card.pointsProgram) });
  }
  if (card.hasTravelInsurance) list.push({ Icon: Umbrella, label: "Seguro viagem" });
  if (card.hasZeroIof) list.push({ Icon: Globe, label: "Sem IOF" });
  return list;
};

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

  const fee = annualFee(card);
  const barrier = accessBarrier(card);
  const perkList = perks(card);

  return (
    <article
      className={cn(
        "border-line bg-surface-raised hover:border-line-strong relative flex flex-col gap-4 rounded-xl border p-5 transition-colors",
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/cards/${card.id}`}
            className="text-heading text-ink hover:text-accent focus-visible:ring-accent min-w-0 rounded leading-tight after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:ring-2"
          >
            {card.name}
          </Link>
          <button
            type="button"
            aria-pressed={inCompare}
            aria-label={inCompare ? "Tirar da comparação" : "Comparar"}
            onClick={handleCompare}
            className={cn(
              "relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
              inCompare
                ? "border-accent bg-accent text-white"
                : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {inCompare ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <CardArt
            brand={card.brand}
            tier={card.tier}
            bank={card.bank}
            size="xs"
            className="shrink-0"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-caption text-ink-subtle">
              {formatBankLabel(card.bank, card.id)} · {card.tier} · {card.brand}
            </p>
            {isCurrentCard && <span className="text-caption text-accent">Seu cartão hoje</span>}
          </div>
        </div>
      </div>

      <div className="border-line flex flex-col gap-3 border-t pt-4">
        <div>
          <p className="text-num text-ink text-xl font-semibold">{fee.headline}</p>
          {fee.caption !== null && (
            <p className="text-ink-subtle mt-0.5 text-xs leading-snug">{fee.caption}</p>
          )}
        </div>

        {barrier !== null && (
          <p
            className={cn(
              "flex items-start gap-1.5 text-xs leading-snug",
              barrier.tone === "warning" ? "text-warning" : "text-ink-subtle",
            )}
          >
            <Lock size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            {barrier.text}
          </p>
        )}

        {perkList.length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
            {perkList.map(({ Icon, label }) => (
              <li key={label} className="text-ink-muted flex items-center gap-1.5 text-xs">
                <Icon size={14} className="text-ink-subtle shrink-0" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {card.lastVerified !== undefined && (
        <div className="mt-auto">
          <VerifiedMark
            lastVerified={card.lastVerified}
            {...(card.verifiedTier !== undefined ? { verifiedTier: card.verifiedTier } : {})}
          />
        </div>
      )}
    </article>
  );
};
