import { type JSX, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { CardArt } from "@/components/domain/CardArt";
import { FeeTierBadge } from "@/components/domain/FeeTierBadge";
import { FeeWaiverBadge } from "@/components/domain/FeeWaiverBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { useSession } from "@/context/SessionContext";
import { CompareMobileCards, type MobileRow } from "@/features/compare/CompareMobileCards";
import { CompareSubstituteCTA } from "@/features/compare/CompareSubstituteCTA";
import { CompareWinnerTooltip } from "@/features/compare/CompareWinnerTooltip";
import { useModeledReturns } from "@/features/compare/useModeledReturns";
import { formatBrl, formatCashbackRate } from "@/lib/format";
import { CompareCardCombobox } from "./CompareCardCombobox";
import type { PublicCardDetail, PublicCatalogCard } from "@/types";

interface CompareTableProps {
  cards: PublicCardDetail[];
  catalogCards?: PublicCatalogCard[];
  onAddCard?: (id: string) => void;
  onRemoveCard?: (id: string) => void;
}

const FX_SOURCE_LABEL: Record<string, string> = {
  official: "Spread oficial",
  secondary: "Fonte secundária",
  assumption: "Estimado",
  mixed: "Misto",
};

const loungeSummary = (card: PublicCardDetail): string => {
  if (!card.hasLoungeAccess || card.loungeAccess === undefined) return "Não";
  if (card.loungeAccess.unlimited === true) return "Ilimitado";
  if (card.loungeAccess.visitsPerYear !== undefined) {
    return `${String(card.loungeAccess.visitsPerYear)} visitas/ano`;
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

const highestCashbackWinners = (cards: PublicCardDetail[]): Set<number> => {
  const vals = cards.map((c) => c.cashbackRatePercent ?? 0);
  const max = Math.max(...vals);
  if (max === 0) return new Set<number>();
  const winners = new Set(vals.flatMap((v, i) => (v === max ? [i] : [])));
  return winners.size < cards.length ? winners : new Set<number>();
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

const cashbackTooltips = (
  cards: PublicCardDetail[],
  winners: Set<number>,
  monthlyDomesticBrl: number | undefined,
): (string | undefined)[] => {
  const rates = cards.map((c) => c.cashbackRatePercent ?? 0);
  const nonWinnerRates = rates.flatMap((r, i) => (winners.has(i) ? [] : [r]));
  const secondRate = nonWinnerRates.length > 0 ? Math.max(...nonWinnerRates) : 0;
  return cards.map((_, i) => {
    if (!winners.has(i)) return undefined;
    const rate = rates[i] ?? 0;
    if (monthlyDomesticBrl !== undefined && monthlyDomesticBrl > 0) {
      const annual = rate * monthlyDomesticBrl * 12;
      const secondAnnual = secondRate * monthlyDomesticBrl * 12;
      return `${formatCashbackRate(rate)} × ${formatBrl(monthlyDomesticBrl)}/mês = ${formatBrl(annual)}/ano. Segundo: ${formatBrl(secondAnnual)}/ano.`;
    }
    return `${formatCashbackRate(rate)}. Segundo: ${formatCashbackRate(secondRate)}.`;
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
}

const Row = ({
  label,
  cells,
  winners = new Set<number>(),
  tooltips,
  hidden = false,
}: RowProps): JSX.Element | null => {
  if (hidden) return null;

  return (
    <tr className="compare-print-row border-line border-b print:break-inside-avoid">
      <th
        scope="row"
        className="text-body-sm text-ink-muted w-32 shrink-0 py-3 pr-4 text-left align-top font-medium"
      >
        {label}
      </th>
      {cells.map((cell, i) => {
        const isWinner = winners.has(i);
        const tooltipText = tooltips?.[i];
        return (
          <td
            key={i}
            className={cn(
              "text-body-sm text-ink px-2 py-3 align-top",
              isWinner && "text-accent font-semibold",
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

export const CompareTable = ({
  cards,
  catalogCards = [],
  onAddCard,
  onRemoveCard,
}: CompareTableProps): JSX.Element => {
  const [hideEqualRows, setHideEqualRows] = useState(false);
  const { profile } = useSession();
  const currentCardIds = profile?.currentCardIds ?? [];
  const feeWinners = lowestFeeWinners(cards);
  const loungeWinners = bestLoungeWinners(cards);
  const cashbackWinners = highestCashbackWinners(cards);
  const modeledReturns = useModeledReturns();
  const selectedIds = cards.map((card) => card.id);
  const addDisabled = selectedIds.length >= 4 || onAddCard === undefined;

  const cashbackLabel = (c: PublicCardDetail): string => {
    if (c.cashbackRatePercent === undefined) return "—";
    const kind = c.hasInvestback ? "investback" : "cashback";
    return `${formatCashbackRate(c.cashbackRatePercent)} ${kind}`;
  };

  const insuranceLabel = (c: PublicCardDetail): string => {
    if (c.travelInsuranceLevel === "premium") return "Premium";
    if (c.travelInsuranceLevel === "basic") return "Basic";
    return "Não";
  };

  const fxLabel = (c: PublicCardDetail): string =>
    c.foreignExchangeCostSource !== undefined
      ? (FX_SOURCE_LABEL[c.foreignExchangeCostSource] ?? c.foreignExchangeCostSource)
      : "—";

  const verifiedLabel = (c: PublicCardDetail): string =>
    c.verifiedTier !== undefined ? `Tier ${String(c.verifiedTier)}` : "—";

  const modeledRow: CompareRow | null = (() => {
    if (modeledReturns.status === "idle" || modeledReturns.status === "error") {
      return null;
    }
    if (modeledReturns.status === "loading") {
      return {
        label: "Retorno modelado pro seu perfil",
        cells: cards.map((c) => (
          <span
            key={c.id}
            aria-label="Calculando"
            className="bg-surface-sunken inline-block h-4 w-20 animate-pulse rounded"
          />
        )),
        values: cards.map(() => ""),
        winners: new Set<number>(),
      };
    }
    const values = cards.map((c) => modeledReturns.byCardId[c.id]);
    const known = values.flatMap((v, i) => (v !== undefined ? [{ i, v }] : []));
    const knownReturns = known.map((entry) => entry.v);
    const winnersIdx = highestModeledReturnWinners(knownReturns);
    const winnerSet = new Set(known.flatMap((entry, j) => (winnersIdx.has(j) ? [entry.i] : [])));
    return {
      label: "Retorno modelado pro seu perfil",
      cells: values.map((v) => (v !== undefined ? `${formatBrl(v)}/ano` : "—")),
      values: values.map((v) => (v !== undefined ? `${formatBrl(v)}/ano` : "—")),
      winners: winnerSet,
      tooltips: modeledReturnTooltips(values, winnerSet),
    };
  })();

  const allRows: CompareRow[] = [
    ...(modeledRow !== null ? [modeledRow] : []),
    {
      label: "Anuidade",
      cells: cards.map((c) => (
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
      values: cards.map((c) => formatBrl(c.annualFeeBrl)),
      winners: feeWinners,
      tooltips: lowestFeeTooltips(cards, feeWinners),
    },
    {
      label: "Programa",
      cells: cards.map((c) => c.pointsProgram),
      values: cards.map((c) => c.pointsProgram),
      winners: new Set<number>(),
    },
    {
      label: cards.some((c) => c.hasInvestback) ? "Cashback / Investback" : "Cashback",
      cells: cards.map(cashbackLabel),
      values: cards.map(cashbackLabel),
      winners: cashbackWinners,
      tooltips: cashbackTooltips(cards, cashbackWinners, profile?.monthlyDomesticBrl),
    },
    {
      label: "Lounge",
      cells: cards.map(loungeSummary),
      values: cards.map(loungeSummary),
      winners: loungeWinners,
      tooltips: loungeTooltips(cards, loungeWinners),
    },
    {
      label: "Seguro",
      cells: cards.map(insuranceLabel),
      values: cards.map(insuranceLabel),
      winners: new Set<number>(),
    },
    {
      label: "Bagagem",
      cells: cards.map((c) => (c.hasFreeCheckedBaggage ? "Grátis" : "Não")),
      values: cards.map((c) => (c.hasFreeCheckedBaggage ? "Grátis" : "Não")),
      winners: new Set<number>(),
    },
    {
      label: "Câmbio",
      cells: cards.map(fxLabel),
      values: cards.map(fxLabel),
      winners: new Set<number>(),
    },
    {
      label: "IOF zero",
      cells: cards.map((c) => (c.hasZeroIof ? "Sim" : "Não")),
      values: cards.map((c) => (c.hasZeroIof ? "Sim" : "Não")),
      winners: new Set<number>(),
    },
    ...(cards.some((c) => c.verifiedTier !== undefined)
      ? [
          {
            label: "Verificação",
            cells: cards.map(verifiedLabel),
            values: cards.map(verifiedLabel),
            winners: new Set<number>(),
          },
        ]
      : []),
  ];

  const visibleRows = hideEqualRows ? allRows.filter((row) => !isEqualRow(row)) : allRows;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <label className="text-body-sm text-ink flex items-center gap-2">
          <Checkbox
            checked={hideEqualRows}
            disabled={cards.length <= 1}
            onChange={(event) => {
              setHideEqualRows(event.target.checked);
            }}
          />
          Esconder linhas iguais
        </label>
        <Button
          onClick={() => {
            window.print();
          }}
          variant="ghost"
          size="sm"
          ariaLabel="Imprimir comparação"
        >
          Imprimir →
        </Button>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-line border-b">
              <th className="w-32 shrink-0 px-2 py-3 text-left align-bottom">
                <CompareCardCombobox
                  cards={catalogCards}
                  selectedIds={selectedIds}
                  disabled={addDisabled}
                  onSelect={(id) => onAddCard?.(id)}
                />
              </th>
              {cards.map((card) => (
                <th key={card.id} className="px-2 py-3 text-left align-bottom">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardArt brand={card.brand} tier={card.tier} bank={card.bank} size="sm" />
                      {onRemoveCard !== undefined ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          ariaLabel={`Remover ${card.name}`}
                          onClick={() => {
                            onRemoveCard(card.id);
                          }}
                        >
                          ×
                        </Button>
                      ) : null}
                    </div>
                    <Link
                      to={`/cards/${card.id}`}
                      className="text-subheading text-ink hover:text-accent font-semibold"
                    >
                      {card.name}
                    </Link>
                    {currentCardIds.includes(card.id) ? (
                      <Badge tone="neutral" className="w-fit">
                        Seu cartão
                      </Badge>
                    ) : null}
                    <p className="text-caption text-ink-subtle tracking-wide uppercase">
                      {card.bank} · {card.tier}
                    </p>
                  </div>
                </th>
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
                {...(row.tooltips !== undefined ? { tooltips: row.tooltips } : {})}
              />
            ))}
          </tbody>
        </table>
        <CompareSubstituteCTA cards={cards} />
      </div>
      <CompareMobileCards
        cards={cards}
        rows={visibleRows}
        footer={<CompareSubstituteCTA cards={cards} />}
      />
    </div>
  );
};
