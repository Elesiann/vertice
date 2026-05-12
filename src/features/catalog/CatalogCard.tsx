import type { JSX } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Armchair,
  BadgeCheck,
  Check,
  Globe,
  Lock,
  type LucideIcon,
  Percent,
  PiggyBank,
  Plane,
  Plus,
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

// Valores grandes ficam mais escaneáveis abreviados: "R$ 50 mil", "R$ 30
// milhões". Centavos fora; "mil" só para múltiplos exatos de mil abaixo de 1mi.
const formatBrlShort = (value: number): string => {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const label = millions === 1 ? "milhão" : "milhões";
    const num = Number.isInteger(millions)
      ? String(millions)
      : millions.toFixed(1).replace(".", ",");
    return `R$ ${num} ${label}`;
  }
  if (value >= 1000 && value % 1000 === 0) return `R$ ${String(value / 1000)} mil`;
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
};

interface AnnualFee {
  amount: string;
  waiver: string | null;
}

// Cartões sem anuidade não recebem o bloco de anuidade — "Sem anuidade" entra
// como o primeiro item da fileira de benefícios. Aqui só os com cobrança.
const annualFee = (card: PublicCatalogCard): AnnualFee | null => {
  if (card.annualFeeBrl === 0) return null;

  const conditions: string[] = [];
  if (card.annualFeeWaiverThresholdBrl !== undefined) {
    conditions.push(`gasto de ${formatBrlShort(card.annualFeeWaiverThresholdBrl)}/mês`);
  }
  if (card.investmentFeeWaiverBrl !== undefined) {
    conditions.push(`${formatBrlShort(card.investmentFeeWaiverBrl)} investidos`);
  }
  return {
    amount: formatBrlShort(card.annualFeeBrl),
    waiver: conditions.length > 0 ? `isenta com ${conditions.join(" ou ")}` : null,
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
  if (card.annualFeeBrl === 0) list.push({ Icon: BadgeCheck, label: "Sem anuidade" });
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
        "border-line bg-surface-raised hover:border-line-strong relative flex flex-col overflow-hidden rounded-xl border transition-colors",
        className,
      )}
    >
      <div className="relative">
        <CardArt brand={card.brand} tier={card.tier} className="!w-full rounded-b-none border-0" />
        <button
          type="button"
          aria-pressed={inCompare}
          aria-label={inCompare ? "Tirar da comparação" : "Comparar"}
          onClick={handleCompare}
          className={cn(
            "absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border backdrop-blur-sm transition-colors",
            inCompare
              ? "border-accent bg-accent text-white"
              : "border-line/60 bg-surface-raised/85 text-ink-muted hover:bg-surface-raised hover:text-ink",
          )}
        >
          {inCompare ? <Check size={16} /> : <Plus size={16} />}
        </button>
      </div>

      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <Link
            to={`/cards/${card.id}`}
            className="text-heading text-ink hover:text-accent focus-visible:ring-accent rounded leading-tight after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:ring-2"
          >
            {card.name}
          </Link>
          <p className="text-caption text-ink-subtle">
            {formatBankLabel(card.bank, card.id)} · {card.tier} · {card.brand}
          </p>
          {isCurrentCard && <span className="text-caption text-accent">Seu cartão hoje</span>}
        </div>

        <div className="border-line flex flex-col gap-3 border-t pt-3">
          {fee !== null && (
            <div>
              <p className="text-caption text-ink-subtle">Anuidade</p>
              <p className="text-num text-ink mt-0.5 text-lg font-semibold">
                {fee.amount}
                <span className="text-ink-muted text-sm font-normal"> /ano</span>
              </p>
              {fee.waiver !== null && (
                <p className="text-ink-subtle mt-1 text-xs leading-snug">{fee.waiver}</p>
              )}
            </div>
          )}

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
          <VerifiedMark
            lastVerified={card.lastVerified}
            {...(card.verifiedTier !== undefined ? { verifiedTier: card.verifiedTier } : {})}
          />
        )}
      </div>
    </article>
  );
};
