import type { JSX } from "react";
import { Link } from "react-router-dom";
import {
  Armchair,
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
import { CardImage } from "@/components/domain/CardImage";
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

// No máximo este número de benefícios na fileira (≈ 2 linhas). O resto fica
// na página de detalhe — o card é uma vitrine, não a ficha completa.
const MAX_PERKS = 5;

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

// Todo card tem o bloco "Anuidade" (mantém as alturas alinhadas na grade).
// `null` = sem cobrança ("Zero"); o valor "R$ X/ano" caso contrário.
// A condição de isenção fica na página de detalhe, não no card.
const annualFeeAmount = (card: PublicCatalogCard): string | null =>
  card.annualFeeBrl === 0 ? null : formatBrlShort(card.annualFeeBrl);

// Barreira real para *contratar* o cartão (≠ isenção de anuidade): exigência
// de investimento alto ou private banking. "Precisa de conta corrente" não
// entra — é quase universal e não diz nada. Vira um chip sobreposto na imagem
// (`short` = texto curto do chip; `full` = texto do tooltip/leitor de tela).
interface AccessBarrier {
  short: string;
  full: string;
}

const accessBarrier = (card: PublicCatalogCard): AccessBarrier | null => {
  const invested = card.requiredInvestmentBrl ?? card.minInvestmentBrl;
  const rel = card.requiresRelationship;

  if ((rel === "investment" || rel === "private") && invested !== undefined && invested > 0) {
    const amount = formatBrlShort(invested);
    const where = rel === "private" ? "em private banking" : "investidos na corretora do emissor";
    return { short: `Exige ${amount}`, full: `Exige ${amount} ${where}` };
  }
  if (rel === "private") {
    return { short: "Private banking", full: "Acesso restrito a clientes de private banking" };
  }
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
  return list.slice(0, MAX_PERKS);
};

export const CatalogCard = ({
  card,
  onCompare,
  inCompare = false,
  className,
}: CatalogCardProps): JSX.Element => {
  const { profile } = useSession();
  const isCurrentCard = profile?.currentCardIds?.includes(card.id) === true;

  const handleCompare = (): void => {
    onCompare?.(card.id);
  };

  const feeAmount = annualFeeAmount(card);
  const barrier = accessBarrier(card);
  const perkList = perks(card);

  return (
    <article
      className={cn(
        // Proporção fixa do card (não altura fixa em px): a imagem mantém sua
        // proporção e a área de conteúdo escala junto com a largura — assim os
        // cards ficam uniformes em qualquer breakpoint. A barreira de acesso
        // vira um chip sobreposto na imagem, então o conteúdo abaixo tem sempre
        // a mesma altura (sem espremer no rodapé).
        "border-line bg-surface-raised hover:border-line-strong relative flex flex-col overflow-hidden rounded-xl border transition-colors sm:aspect-[3/4]",
        className,
      )}
    >
      <div className="relative shrink-0">
        <CardImage
          {...(card.imagePath !== undefined ? { imagePath: card.imagePath } : {})}
          name={card.name}
          brand={card.brand}
          tier={card.tier}
          className="!w-full rounded-b-none border-0"
        />

        {barrier !== null && (
          <span
            className="group/barrier border-line/40 bg-surface-raised/85 text-ink-muted absolute top-3 left-3 z-10 inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium backdrop-blur-sm"
            title={barrier.full}
          >
            <Lock size={12} className="text-ink-subtle shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">{barrier.short}</span>
            <span
              role="tooltip"
              className="border-line bg-surface-raised text-ink pointer-events-none invisible absolute top-full left-0 z-30 mt-1.5 w-max max-w-[14rem] rounded-md border px-3 py-2 text-xs leading-relaxed font-normal opacity-0 shadow-md transition group-hover/barrier:visible group-hover/barrier:opacity-100"
            >
              {barrier.full}
            </span>
          </span>
        )}

        <button
          type="button"
          aria-pressed={inCompare}
          aria-label={inCompare ? "Tirar da comparação" : "Comparar"}
          onClick={handleCompare}
          className={cn(
            "focus-visible:ring-accent absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border backdrop-blur-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            inCompare
              ? "border-accent bg-accent text-white"
              : "border-line/60 bg-surface-raised/85 text-ink-muted hover:bg-surface-raised hover:text-ink",
          )}
        >
          {inCompare ? <Check size={16} /> : <Plus size={16} />}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-hidden p-4">
        <div className="flex flex-col gap-0.5">
          <Link
            to={`/cards/${card.id}`}
            className="text-heading text-ink hover:text-accent focus-visible:ring-accent line-clamp-2 rounded leading-tight after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:ring-2 sm:min-h-[3.25rem]"
          >
            {card.name}
          </Link>
          <p className="text-caption text-ink-subtle">
            {formatBankLabel(card.bank, card.id)} · {card.tier} · {card.brand}
          </p>
          {isCurrentCard && <span className="text-caption text-accent">Seu cartão hoje</span>}
        </div>

        <div className="border-line flex flex-col gap-2 border-t pt-2">
          <div>
            <p className="text-caption text-ink-subtle">Anuidade</p>
            {feeAmount !== null ? (
              <p className="text-num text-ink text-lg font-semibold">
                {feeAmount}
                <span className="text-ink-muted text-sm font-normal"> /ano</span>
              </p>
            ) : (
              <p className="text-ink text-lg font-semibold">Zero</p>
            )}
          </div>

          {perkList.length > 0 && (
            <ul className="flex h-12 flex-wrap content-start gap-x-3 gap-y-1.5 overflow-hidden">
              {perkList.map(({ Icon, label }) => (
                <li
                  key={label}
                  className="text-ink-muted flex h-5 max-w-full items-center gap-1.5 text-xs"
                >
                  <Icon size={14} className="text-ink-subtle shrink-0" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {card.lastVerified !== undefined && (
          <div className="mt-auto pt-1">
            <VerifiedMark
              lastVerified={card.lastVerified}
              {...(card.verifiedTier !== undefined ? { verifiedTier: card.verifiedTier } : {})}
            />
          </div>
        )}
      </div>
    </article>
  );
};
