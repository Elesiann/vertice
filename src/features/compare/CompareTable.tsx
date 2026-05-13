import { type JSX, useState } from "react";
import { Star, X } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { CardImage } from "@/components/domain/CardImage";
import { FeeTierBadge } from "@/components/domain/FeeTierBadge";
import { FeeWaiverBadge } from "@/components/domain/FeeWaiverBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

import { useSession } from "@/context/SessionContext";
import { CompareMobileCards, type MobileRow } from "@/features/compare/CompareMobileCards";
import { CompareSubstituteCTA } from "@/features/compare/CompareSubstituteCTA";
import { CompareWinnerTooltip } from "@/features/compare/CompareWinnerTooltip";
import { type ModeledCardRewards, useModeledReturns } from "@/features/compare/useModeledReturns";
import { formatBrl, formatCashbackRate, formatIsoDateBr } from "@/lib/format";
import { formatBankLabel, formatPointsProgram } from "@/lib/labels";
import { CompareCardCombobox } from "./CompareCardCombobox";

import type { PublicCardDetail, PublicCatalogCard } from "@/types";

interface CompareTableProps {
  cards: PublicCardDetail[];
  catalogCards?: PublicCatalogCard[];
  onAddCard?: (id: string) => void;
  onAddRecommendedCard?: (id: string, replaceId?: string) => void;
  onRemoveCard?: (id: string) => void;
}

const FX_SOURCE_LABEL: Record<string, string> = {
  official: "Spread oficial",
  secondary: "Fonte secundária",
  assumption: "Estimado",
  mixed: "Misto",
};

const loungeSummary = (card: PublicCardDetail): string => {
  if (!card.hasLoungeAccess || card.loungeAccess === undefined) return "—";
  if (card.loungeAccess.unlimited === true) return "Ilimitado";
  if (card.loungeAccess.visitsPerYear !== undefined) {
    return `${String(card.loungeAccess.visitsPerYear)} visitas`;
  }
  return "Condicional";
};

const lowestFeeWinners = (cards: PublicCardDetail[]): Set<number> => {
  const fees = cards.map((c) => c.annualFeeBrl);
  const min = Math.min(...fees);
  const winners = new Set(fees.flatMap((f, i) => (f === min ? [i] : [])));
  return winners.size < cards.length ? winners : new Set<number>();
};

const loungeRank = (c: PublicCardDetail): number => {
  if (!c.hasLoungeAccess) return 0;
  if (c.loungeAccess?.unlimited === true) return Number.POSITIVE_INFINITY;
  if (c.loungeAccess?.visitsPerYear !== undefined) return c.loungeAccess.visitsPerYear;
  return 0.5;
};

const bestLoungeWinners = (cards: PublicCardDetail[]): Set<number> => {
  const ranks = cards.map(loungeRank);
  const max = Math.max(...ranks);
  if (max === 0) return new Set<number>();
  const winners = new Set(ranks.flatMap((r, i) => (r === max ? [i] : [])));
  return winners.size < cards.length ? winners : new Set<number>();
};

const highestRewardWinners = (rates: (number | undefined)[]): Set<number> => {
  const vals = rates.map((rate) => rate ?? 0);
  const max = Math.max(...vals);
  if (max === 0) return new Set<number>();
  const winners = new Set(vals.flatMap((v, i) => (v === max ? [i] : [])));
  return winners.size < rates.length ? winners : new Set<number>();
};

const highestRankWinners = (ranks: number[]): Set<number> => {
  if (ranks.length === 0) return new Set<number>();
  const max = Math.max(...ranks);
  if (max === 0) return new Set<number>();
  const winners = new Set(ranks.flatMap((rank, i) => (rank === max ? [i] : [])));
  return winners.size < ranks.length ? winners : new Set<number>();
};

const highestModeledReturnWinners = (returns: number[]): Set<number> => {
  if (returns.length === 0) return new Set<number>();
  const max = Math.max(...returns);
  const winners = new Set(returns.flatMap((v, i) => (v === max ? [i] : [])));
  return winners.size < returns.length ? winners : new Set<number>();
};

const lowestFeeTooltips = (
  cards: PublicCardDetail[],
  winners: Set<number>,
): (string | undefined)[] => {
  const fees = cards.map((c) => c.annualFeeBrl);
  const nonWinnerFees = fees.flatMap((f, i) => (winners.has(i) ? [] : [f]));
  if (nonWinnerFees.length === 0) return cards.map(() => undefined);
  const second = Math.min(...nonWinnerFees);
  return cards.map((_, i) => {
    if (!winners.has(i)) return undefined;
    const winnerFee = fees[i] ?? 0;
    const delta = second - winnerFee;
    return `${formatBrl(winnerFee)}/ano. ${formatBrl(delta)} a menos que segundo.`;
  });
};

const rewardRateLabel = (rate: number): string => formatCashbackRate(rate);

const annualSpendBrlForProfile = (
  monthlyDomesticBrl: number | undefined,
  monthlyInternationalUsd: number | undefined,
  ptaxRate: number | null,
): number | null => {
  const domestic = monthlyDomesticBrl ?? 0;
  const internationalUsd = monthlyInternationalUsd ?? 0;
  const internationalBrl = ptaxRate !== null ? internationalUsd * ptaxRate : 0;
  const annualSpend = (domestic + internationalBrl) * 12;
  return annualSpend > 0 ? annualSpend : null;
};

const rewardRateForCard = (
  card: PublicCardDetail,
  rewards: ModeledCardRewards | undefined,
  annualSpendBrl: number | null,
): number | undefined => {
  if (card.cashbackRatePercent !== undefined) return card.cashbackRatePercent;
  if (rewards !== undefined && annualSpendBrl !== null && rewards.grossValueBrl > 0) {
    return rewards.grossValueBrl / annualSpendBrl;
  }
  return undefined;
};

const pointsRateLabel = (card: PublicCardDetail): string | null => {
  const rates = [
    card.pointsPerUsdDomestic !== undefined
      ? `${card.pointsPerUsdDomestic.toFixed(2).replace(".", ",")} pts/USD BR`
      : null,
    card.pointsPerUsdInternational !== undefined
      ? `${card.pointsPerUsdInternational.toFixed(2).replace(".", ",")} pts/USD ext.`
      : null,
  ].filter((rate): rate is string => rate !== null);
  return rates.length > 0 ? rates.join(" · ") : null;
};

const rewardLabel = (
  card: PublicCardDetail,
  rewards: ModeledCardRewards | undefined,
  annualSpendBrl: number | null,
): string | JSX.Element => {
  if (card.cashbackRatePercent !== undefined) {
    const rate = formatCashbackRate(card.cashbackRatePercent);
    return card.hasInvestback ? `${rate} (investback)` : rate;
  }

  const rate = rewardRateForCard(card, rewards, annualSpendBrl);
  if (rate !== undefined) {
    return (
      <span className="flex flex-col">
        <span>≈ {rewardRateLabel(rate)} em valor</span>
        <span className="text-caption text-ink-subtle tracking-normal normal-case italic">
          {formatPointsProgram(card.pointsProgram)}
        </span>
      </span>
    );
  }

  const pointsRate = pointsRateLabel(card);
  if (pointsRate !== null) return pointsRate;
  return formatPointsProgram(card.pointsProgram);
};

const rewardValue = (
  card: PublicCardDetail,
  rewards: ModeledCardRewards | undefined,
  annualSpendBrl: number | null,
): string => {
  if (card.cashbackRatePercent !== undefined) {
    const rate = formatCashbackRate(card.cashbackRatePercent);
    return card.hasInvestback ? `${rate} (investback)` : rate;
  }
  const rate = rewardRateForCard(card, rewards, annualSpendBrl);
  if (rate !== undefined) return `≈ ${rewardRateLabel(rate)} em valor`;
  return pointsRateLabel(card) ?? formatPointsProgram(card.pointsProgram);
};

const rewardTooltips = (
  cards: PublicCardDetail[],
  winners: Set<number>,
  rewards: (ModeledCardRewards | undefined)[],
  rates: (number | undefined)[],
  annualSpendBrl: number | null,
): (string | undefined)[] => {
  const nonWinnerRates = rates.flatMap((r, i) => (winners.has(i) ? [] : [r ?? 0]));
  const secondRate = nonWinnerRates.length > 0 ? Math.max(...nonWinnerRates) : 0;
  return cards.map((card, i) => {
    if (!winners.has(i)) return undefined;
    const rate = rates[i] ?? 0;
    const reward = rewards[i];
    if (annualSpendBrl !== null) {
      const annual = reward?.grossValueBrl ?? rate * annualSpendBrl;
      const secondAnnual = secondRate * annualSpendBrl;
      const source =
        card.cashbackRatePercent !== undefined
          ? "cashback"
          : formatPointsProgram(card.pointsProgram);
      return `${rewardRateLabel(rate)} em ${source} = ${formatBrl(annual)}/ano em valor. Segundo: ${formatBrl(secondAnnual)}/ano.`;
    }
    return `${rewardRateLabel(rate)}. Segundo: ${rewardRateLabel(secondRate)}.`;
  });
};

const loungeTooltips = (
  cards: PublicCardDetail[],
  winners: Set<number>,
): (string | undefined)[] => {
  const nonWinnerHasUnlimited = cards.some(
    (c, i) => !winners.has(i) && c.loungeAccess?.unlimited === true,
  );
  const nonWinnerVisits = cards.flatMap((c, i) =>
    !winners.has(i) && c.loungeAccess?.visitsPerYear !== undefined
      ? [c.loungeAccess.visitsPerYear]
      : [],
  );
  const segundoStr = nonWinnerHasUnlimited
    ? "ilimitado"
    : nonWinnerVisits.length > 0
      ? `${String(Math.max(...nonWinnerVisits))}/ano`
      : "sem lounge";
  return cards.map((c, i) => {
    if (!winners.has(i)) return undefined;
    if (c.loungeAccess?.unlimited === true) {
      return `Ilimitado. Segundo: ${segundoStr}.`;
    }
    if (c.loungeAccess?.visitsPerYear !== undefined) {
      return `${String(c.loungeAccess.visitsPerYear)}/ano. Segundo: ${segundoStr}.`;
    }
    return undefined;
  });
};

const modeledReturnTooltips = (
  returns: (number | undefined)[],
  winners: Set<number>,
): (string | undefined)[] => {
  const knownNonWinner = returns.flatMap((v, i) => (!winners.has(i) && v !== undefined ? [v] : []));
  const second = knownNonWinner.length > 0 ? Math.max(...knownNonWinner) : null;
  return returns.map((v, i) => {
    if (!winners.has(i) || v === undefined) return undefined;
    if (second === null) {
      return `${formatBrl(v)}/ano modelado.`;
    }
    return `${formatBrl(v)}/ano modelado. ${formatBrl(v - second)} a mais que segundo.`;
  });
};

const insuranceRank = (c: PublicCardDetail): number => {
  if (c.travelInsuranceLevel === "premium") return 2;
  if (c.travelInsuranceLevel === "basic") return 1;
  return 0;
};

interface CompareRow extends MobileRow {
  values: string[];
  tooltips?: (string | undefined)[];
}

interface RowProps {
  label: string;
  cells: (string | JSX.Element)[];
  winners?: Set<number>;
  tooltips?: (string | undefined)[];
  hidden?: boolean;
  winnerIndexes?: Set<number>;
}

const Row = ({
  label,
  cells,
  winners = new Set<number>(),
  tooltips,
  hidden = false,
  winnerIndexes = new Set<number>(),
}: RowProps): JSX.Element | null => {
  if (hidden) return null;

  return (
    <tr className="compare-print-row border-line border-b print:break-inside-avoid">
      <th
        scope="row"
        className="text-body-sm text-ink-muted w-36 shrink-0 py-3 pr-4 text-left align-top font-medium"
      >
        {label}
      </th>
      {cells.map((cell, i) => {
        const isWinner = winners.has(i);
        const hasWinner = winners.size > 0;
        const isOverallWinner = winnerIndexes.has(i);
        const tooltipText = tooltips?.[i];
        return (
          <td
            key={i}
            className={cn(
              "text-body-sm px-3 py-3 align-top transition-colors",
              isOverallWinner ? "compare-winner-col" : "border-l border-transparent",
              isWinner ? "text-ink font-semibold" : hasWinner ? "text-ink-muted" : "text-ink",
            )}
          >
            {tooltipText !== undefined && isWinner ? (
              <CompareWinnerTooltip text={tooltipText}>{cell}</CompareWinnerTooltip>
            ) : (
              cell
            )}
          </td>
        );
      })}
    </tr>
  );
};

const isEqualRow = (row: CompareRow): boolean => {
  return row.values.length > 1 && row.values.every((value) => value === row.values[0]);
};

// Card header displayed above each column in the comparison table
interface CardHeaderCellProps {
  card: PublicCardDetail;
  isComparisonWinner: boolean;
  isCurrentCard: boolean;
  delta: number | null; // modeled return delta vs reference
  deltaLabel: string; // "vs. vencedor" | "vs. segundo lugar"
  isWinner: boolean;
  onRemove?: () => void;
}

const CardHeaderCell = ({
  card,
  isComparisonWinner,
  isCurrentCard,
  delta,
  deltaLabel,
  isWinner,
  onRemove,
}: CardHeaderCellProps): JSX.Element => (
  <th
    className={cn(
      "px-2 pt-0 pb-0 text-left align-top",
      isComparisonWinner ? "compare-winner-col" : "",
    )}
  >
    <div
      className={cn(
        "flex h-full flex-col gap-2 rounded-xl p-3 transition-all",
        isComparisonWinner && "bg-gold-soft/10",
      )}
    >
      {/* Badge/remove row — always present to keep uniform height */}
      <div className="flex min-h-[1.5rem] items-center justify-between">
        {isComparisonWinner ? (
          <Badge tone="gold" className="gap-1">
            <Star size={10} aria-hidden />
            Vencedor da comparação
          </Badge>
        ) : (
          <span />
        )}
        {onRemove !== undefined && (
          <button
            type="button"
            aria-label={`Remover ${card.name}`}
            onClick={onRemove}
            className="text-ink-subtle hover:text-ink ml-auto transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Card image / art */}
      <CardImage
        name={card.name}
        brand={card.brand}
        tier={card.tier}
        bank={card.bank}
        size="sm"
        className="w-full"
        {...(card.imagePath !== undefined ? { imagePath: card.imagePath } : {})}
      />

      {/* Card name */}
      <Link
        to={`/cards/${card.id}`}
        className="text-subheading text-ink hover:text-accent leading-tight font-semibold transition-colors"
      >
        {card.name}
      </Link>

      {/* Bank · tier */}
      <p className="text-caption text-ink-subtle -mt-1 tracking-wide uppercase">
        {formatBankLabel(card.bank, card.id)} · {card.tier}
      </p>

      {/* Modeled delta — always reserve space so rows stay aligned */}
      <div className="min-h-[2.5rem]">
        {delta !== null && (
          <>
            <p
              className={cn(
                "text-num text-lg leading-tight font-semibold",
                isWinner ? "text-accent" : "text-ink-muted",
              )}
            >
              {delta >= 0 ? "+" : ""}
              {formatBrl(delta)}
            </p>
            <p className="text-caption text-ink-subtle tracking-normal normal-case italic">
              {deltaLabel}
            </p>
          </>
        )}
      </div>

      {/* Current card badge */}
      {isCurrentCard && (
        <Badge tone="neutral" className="w-fit">
          Seu cartão
        </Badge>
      )}
    </div>
  </th>
);

export const CompareTable = ({
  cards,
  catalogCards = [],
  onAddCard,
  onAddRecommendedCard,
  onRemoveCard,
}: CompareTableProps): JSX.Element => {
  const [hideEqualRows, setHideEqualRows] = useState(() => cards.length >= 3);
  const { profile } = useSession();
  const currentCardIds = profile?.currentCardIds ?? [];
  const modeledReturns = useModeledReturns();
  const selectedIds = cards.map((card) => card.id);
  const addDisabled = selectedIds.length >= 4 || onAddCard === undefined;
  const removeDisabled = selectedIds.length <= 2;

  const insuranceLabel = (c: PublicCardDetail): string => {
    if (c.travelInsuranceLevel === "premium") return "Premium";
    if (c.travelInsuranceLevel === "basic") return "Basic";
    return "Não";
  };

  const fxLabel = (c: PublicCardDetail): string =>
    c.foreignExchangeCostSource !== undefined
      ? (FX_SOURCE_LABEL[c.foreignExchangeCostSource] ?? c.foreignExchangeCostSource)
      : "—";

  // ── Modeled returns & deltas ────────────────────────────────────────────────
  // Sort cards by modeled return (best → worst) when data is available.
  // Falls back to original order while loading.
  const sortedCards =
    modeledReturns.status === "ready"
      ? Array.from(cards).sort((a, b) => {
          const ra = modeledReturns.byCardId[a.id] ?? -Infinity;
          const rb = modeledReturns.byCardId[b.id] ?? -Infinity;
          return rb - ra;
        })
      : cards;

  const sortedReturnValues: (number | undefined)[] = sortedCards.map((c) =>
    modeledReturns.status === "ready" ? modeledReturns.byCardId[c.id] : undefined,
  );
  const annualSpendBrl = annualSpendBrlForProfile(
    profile?.monthlyDomesticBrl,
    profile?.monthlyInternationalUsd,
    modeledReturns.status === "ready" ? modeledReturns.ptaxRate : null,
  );
  const sortedRewards: (ModeledCardRewards | undefined)[] = sortedCards.map((card) =>
    modeledReturns.status === "ready" ? modeledReturns.rewardsByCardId[card.id] : undefined,
  );
  const sortedRewardRates = sortedCards.map((card, i) =>
    rewardRateForCard(card, sortedRewards[i], annualSpendBrl),
  );

  // Per-row winner sets (all based on sortedCards for consistent indexing)
  const sortedFeeWinners = lowestFeeWinners(sortedCards);
  const sortedLoungeWinners = bestLoungeWinners(sortedCards);
  const sortedRewardWinners = highestRewardWinners(sortedRewardRates);
  const sortedInsuranceWinners = highestRankWinners(sortedCards.map(insuranceRank));
  const sortedBaggageWinners = highestRankWinners(
    sortedCards.map((c) => (c.hasFreeCheckedBaggage ? 1 : 0)),
  );
  const sortedZeroIofWinners = highestRankWinners(sortedCards.map((c) => (c.hasZeroIof ? 1 : 0)));
  const known = sortedReturnValues.flatMap((v, i) => (v !== undefined ? [{ i, v }] : []));
  const knownReturns = known.map((e) => e.v);
  const winnersIdx = highestModeledReturnWinners(knownReturns);
  const overallWinnerIndexes = new Set(known.flatMap((e, j) => (winnersIdx.has(j) ? [e.i] : [])));

  // Winner value and runner-up — both derived from sortedReturnValues
  const sortedKnown = Array.from(known).sort((a, b) => b.v - a.v);
  const winnerReturn = sortedKnown.length >= 1 ? (sortedKnown[0]?.v ?? null) : null;
  const runnerUpReturn = sortedKnown.length >= 2 ? (sortedKnown[1]?.v ?? null) : null;

  const cardDeltas: (number | null)[] = sortedCards.map((_, i) => {
    const v = sortedReturnValues[i];
    if (v === undefined) return null;
    if (overallWinnerIndexes.has(i)) {
      return runnerUpReturn !== null ? v - runnerUpReturn : null;
    }
    return winnerReturn !== null ? v - winnerReturn : null;
  });

  const cardDeltaLabels: string[] = sortedCards.map((_, i) => {
    if (overallWinnerIndexes.has(i)) return "vs. segundo lugar";
    return "vs. vencedor";
  });

  const worstComparedId =
    modeledReturns.status === "ready" && selectedIds.length >= 4
      ? selectedIds.reduce<string | undefined>((worstId, id) => {
          if (worstId === undefined) return id;
          const currentReturn = modeledReturns.byCardId[id] ?? Number.NEGATIVE_INFINITY;
          const worstReturn = modeledReturns.byCardId[worstId] ?? Number.NEGATIVE_INFINITY;
          return currentReturn < worstReturn ? id : worstId;
        }, undefined)
      : undefined;
  const recommendedCardId =
    modeledReturns.status === "ready" ? modeledReturns.recommendedCardId : null;
  const canAddRecommended =
    onAddRecommendedCard !== undefined &&
    modeledReturns.status === "ready" &&
    recommendedCardId !== null &&
    !selectedIds.includes(recommendedCardId);
  const recommendedButtonLabel =
    selectedIds.length >= 4
      ? "Adicionar cartão recomendado e substituir o pior"
      : "Adicionar cartão recomendado";
  const handleAddRecommendedCard = (): void => {
    if (onAddRecommendedCard === undefined || modeledReturns.status !== "ready") return;
    const id = modeledReturns.recommendedCardId;
    if (id === null || selectedIds.includes(id)) return;
    onAddRecommendedCard(id, worstComparedId);
  };

  // ── Modeled return row ──────────────────────────────────────────────────────
  const modeledRow: CompareRow | null = (() => {
    if (modeledReturns.status === "idle" || modeledReturns.status === "error") return null;
    if (modeledReturns.status === "loading") {
      return {
        label: "Retorno no seu perfil",
        cells: sortedCards.map((c) => (
          <span
            key={c.id}
            aria-label="Calculando"
            className="bg-surface-sunken inline-block h-4 w-20 animate-pulse rounded"
          />
        )),
        values: sortedCards.map(() => ""),
        winners: new Set<number>(),
      };
    }
    const values = sortedCards.map((c) => modeledReturns.byCardId[c.id]);
    const tooltips = modeledReturnTooltips(values, overallWinnerIndexes);
    return {
      label: "Retorno no seu perfil",
      cells: values.map((v, i) =>
        v !== undefined ? (
          <span key={i} className="flex flex-col">
            <span>{formatBrl(v)}</span>
            <span className="text-caption text-ink-subtle tracking-normal normal-case italic">
              /ano
            </span>
          </span>
        ) : (
          "—"
        ),
      ),
      values: values.map((v) => (v !== undefined ? `${formatBrl(v)}/ano` : "—")),
      winners: overallWinnerIndexes,
      tooltips,
    };
  })();

  const allRows: CompareRow[] = [
    ...(modeledRow !== null ? [modeledRow] : []),
    {
      label: "Programa",
      cells: sortedCards.map((c) => formatPointsProgram(c.pointsProgram)),
      values: sortedCards.map((c) => formatPointsProgram(c.pointsProgram)),
      winners: new Set<number>(),
    },
    {
      label: "Recompensa",
      cells: sortedCards.map((card, i) => rewardLabel(card, sortedRewards[i], annualSpendBrl)),
      values: sortedCards.map((card, i) => rewardValue(card, sortedRewards[i], annualSpendBrl)),
      winners: sortedRewardWinners,
      tooltips: rewardTooltips(
        sortedCards,
        sortedRewardWinners,
        sortedRewards,
        sortedRewardRates,
        annualSpendBrl,
      ),
    },
    {
      label: "Lounge",
      cells: sortedCards.map((c) => (
        <span className="flex flex-col" key={c.id}>
          <span>{loungeSummary(c)}</span>
          {c.hasLoungeAccess && c.loungeAccess?.visitsPerYear !== undefined && (
            <span className="text-caption text-ink-subtle tracking-normal normal-case italic">
              /ano
            </span>
          )}
        </span>
      )),
      values: sortedCards.map(loungeSummary),
      winners: sortedLoungeWinners,
      tooltips: loungeTooltips(sortedCards, sortedLoungeWinners),
    },
    {
      label: "Câmbio",
      cells: sortedCards.map(fxLabel),
      values: sortedCards.map(fxLabel),
      winners: new Set<number>(),
    },
    {
      label: "Anuidade",
      cells: sortedCards.map((c) => (
        <span key={c.id} className="flex flex-col items-start gap-1">
          {formatBrl(c.annualFeeBrl)}
          <FeeTierBadge annualFeeBrl={c.annualFeeBrl} />
          <FeeWaiverBadge
            className="mt-1"
            {...(c.annualFeeWaiverThresholdBrl !== undefined
              ? { annualFeeWaiverThresholdBrl: c.annualFeeWaiverThresholdBrl }
              : {})}
            {...(c.investmentFeeWaiverBrl !== undefined
              ? { investmentFeeWaiverBrl: c.investmentFeeWaiverBrl }
              : {})}
          />
        </span>
      )),
      values: sortedCards.map((c) => formatBrl(c.annualFeeBrl)),
      winners: sortedFeeWinners,
      tooltips: lowestFeeTooltips(sortedCards, sortedFeeWinners),
    },
    {
      label: "Seguro",
      cells: sortedCards.map(insuranceLabel),
      values: sortedCards.map(insuranceLabel),
      winners: sortedInsuranceWinners,
    },
    {
      label: "Bagagem",
      cells: sortedCards.map((c) => (c.hasFreeCheckedBaggage ? "Grátis" : "—")),
      values: sortedCards.map((c) => (c.hasFreeCheckedBaggage ? "Grátis" : "—")),
      winners: sortedBaggageWinners,
    },
    {
      label: "IOF zero",
      cells: sortedCards.map((c) => (c.hasZeroIof ? "Sim" : "—")),
      values: sortedCards.map((c) => (c.hasZeroIof ? "Sim" : "—")),
      winners: sortedZeroIofWinners,
    },
  ];

  const visibleRows = hideEqualRows ? allRows.filter((row) => !isEqualRow(row)) : allRows;
  const hiddenCount = allRows.length - visibleRows.length;

  // Latest lastVerified date across cards
  const lastVerifiedDate = sortedCards.reduce<string | undefined>((latest, card) => {
    if (card.lastVerified === undefined) return latest;
    if (latest === undefined) return card.lastVerified;
    return card.lastVerified > latest ? card.lastVerified : latest;
  }, undefined);

  return (
    <div className="flex flex-col gap-0">
      {/* Toolbar */}
      <div className="border-line flex items-center justify-end gap-3 border-b py-3 print:hidden">
        <Button
          type="button"
          disabled={!canAddRecommended}
          onClick={handleAddRecommendedCard}
          variant="secondary"
          size="sm"
          ariaLabel={recommendedButtonLabel}
        >
          Adicionar cartão recomendado
        </Button>
        <CompareCardCombobox
          cards={catalogCards}
          selectedIds={selectedIds}
          disabled={addDisabled}
          onSelect={(id) => onAddCard?.(id)}
        />
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-line border-b">
              {/* Empty label col header */}
              <th className="w-36 shrink-0" />
              {sortedCards.map((card, cardIdx) => (
                <CardHeaderCell
                  key={card.id}
                  card={card}
                  isComparisonWinner={overallWinnerIndexes.has(cardIdx)}
                  isCurrentCard={currentCardIds.includes(card.id)}
                  delta={cardDeltas[cardIdx] ?? null}
                  deltaLabel={cardDeltaLabels[cardIdx] ?? "vs. vencedor"}
                  isWinner={overallWinnerIndexes.has(cardIdx)}
                  {...(onRemoveCard !== undefined && !removeDisabled
                    ? {
                        onRemove: () => {
                          onRemoveCard(card.id);
                        },
                      }
                    : {})}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <Row
                key={row.label}
                label={row.label}
                cells={row.cells}
                winners={row.winners}
                winnerIndexes={overallWinnerIndexes}
                {...(row.tooltips !== undefined ? { tooltips: row.tooltips } : {})}
              />
            ))}
          </tbody>
        </table>

        {/* Equal-rows toggle — shown whenever there are equal rows */}
        {selectedIds.length > 1 && (hiddenCount > 0 || !hideEqualRows) ? (
          <p className="text-body-sm text-ink-muted border-line border-t py-3 text-center">
            {hideEqualRows ? (
              <>
                {hiddenCount}{" "}
                {hiddenCount === 1 ? "linha igual escondida" : "linhas iguais escondidas"}
                {" — "}
                <button
                  type="button"
                  className="text-accent underline underline-offset-2 transition-all hover:no-underline"
                  onClick={() => {
                    setHideEqualRows(false);
                  }}
                >
                  mostrar todas
                </button>
              </>
            ) : (
              <>
                Mostrando todas as linhas
                {" — "}
                <button
                  type="button"
                  className="text-accent underline underline-offset-2 transition-all hover:no-underline"
                  onClick={() => {
                    setHideEqualRows(true);
                  }}
                >
                  Esconder linhas iguais
                </button>
              </>
            )}
          </p>
        ) : null}

        <CompareSubstituteCTA cards={cards} />

        {/* Footer */}
        <div className="border-line mt-4 flex items-center justify-between border-t pt-3 print:hidden">
          <p className="text-caption text-ink-subtle tracking-normal normal-case">
            {lastVerifiedDate !== undefined ? (
              <>
                Última atualização do modelo:{" "}
                <span className="text-ink-muted">{formatIsoDateBr(lastVerifiedDate)}</span>
              </>
            ) : null}
          </p>
          <Button
            onClick={() => {
              window.print();
            }}
            variant="ghost"
            size="sm"
            ariaLabel="Imprimir comparação"
          >
            Imprimir comparação →
          </Button>
        </div>
      </div>

      {/* Mobile cards */}
      <CompareMobileCards
        cards={sortedCards}
        rows={visibleRows}
        winnerIndexes={overallWinnerIndexes}
        footer={<CompareSubstituteCTA cards={sortedCards} />}
      />
    </div>
  );
};
