import { type JSX, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { CardArt } from "@/components/domain/CardArt";
import { FeeWaiverBadge } from "@/components/domain/FeeWaiverBadge";
import { Checkbox } from "@/components/ui/Checkbox";
import { formatBrl } from "@/lib/format";
import type { PublicCardDetail } from "@/types";

interface CompareTableProps {
  cards: PublicCardDetail[];
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

const bestLoungeWinners = (cards: PublicCardDetail[]): Set<number> => {
  const rank = (c: PublicCardDetail): number => {
    if (!c.hasLoungeAccess) return 0;
    if (c.loungeAccess?.unlimited === true) return 3;
    if (c.loungeAccess?.visitsPerYear !== undefined) return 2;
    return 1;
  };
  const ranks = cards.map(rank);
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

interface RowProps {
  label: string;
  cells: (string | JSX.Element)[];
  winners?: Set<number>;
  hidden?: boolean;
}

const Row = ({
  label,
  cells,
  winners = new Set<number>(),
  hidden = false,
}: RowProps): JSX.Element | null => {
  if (hidden) return null;

  return (
    <tr className="border-line border-b">
      <th
        scope="row"
        className="text-body-sm text-ink-muted w-32 shrink-0 py-3 pr-4 text-left align-top font-medium"
      >
        {label}
      </th>
      {cells.map((cell, i) => (
        <td
          key={i}
          className={cn(
            "text-body-sm text-ink px-2 py-3 align-top",
            winners.has(i) && "text-accent font-semibold",
          )}
        >
          {cell}
        </td>
      ))}
    </tr>
  );
};

interface CompareRow {
  label: string;
  cells: (string | JSX.Element)[];
  values: string[];
  winners?: Set<number>;
}

const isEqualRow = (row: CompareRow): boolean => {
  return row.values.length > 1 && row.values.every((value) => value === row.values[0]);
};

export const CompareTable = ({ cards }: CompareTableProps): JSX.Element => {
  const [hideEqualRows, setHideEqualRows] = useState(false);
  const feeWinners = lowestFeeWinners(cards);
  const loungeWinners = bestLoungeWinners(cards);
  const cashbackWinners = highestCashbackWinners(cards);
  const rows: CompareRow[] = [
    {
      label: "Anuidade",
      cells: cards.map((c) => (
        <span key={c.id}>
          {formatBrl(c.annualFeeBrl)}
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
    },
    {
      label: "Programa",
      cells: cards.map((c) => c.pointsProgram),
      values: cards.map((c) => c.pointsProgram),
    },
    {
      label: cards.some((c) => c.hasInvestback) ? "Cashback / Investback" : "Cashback",
      cells: cards.map((c) => {
        if (c.cashbackRatePercent === undefined) return "—";
        const kind = c.hasInvestback ? "investback" : "cashback";
        return `${String(c.cashbackRatePercent)}% ${kind}`;
      }),
      values: cards.map((c) => {
        if (c.cashbackRatePercent === undefined) return "—";
        const kind = c.hasInvestback ? "investback" : "cashback";
        return `${String(c.cashbackRatePercent)}% ${kind}`;
      }),
      winners: cashbackWinners,
    },
    {
      label: "Lounge",
      cells: cards.map(loungeSummary),
      values: cards.map(loungeSummary),
      winners: loungeWinners,
    },
    {
      label: "Seguro",
      cells: cards.map((c) => {
        if (c.travelInsuranceLevel === "premium") return "Premium";
        if (c.travelInsuranceLevel === "basic") return "Basic";
        return "Não";
      }),
      values: cards.map((c) => {
        if (c.travelInsuranceLevel === "premium") return "Premium";
        if (c.travelInsuranceLevel === "basic") return "Basic";
        return "Não";
      }),
    },
    {
      label: "Bagagem",
      cells: cards.map((c) => (c.hasFreeCheckedBaggage ? "Grátis" : "Não")),
      values: cards.map((c) => (c.hasFreeCheckedBaggage ? "Grátis" : "Não")),
    },
    {
      label: "Câmbio",
      cells: cards.map((c) =>
        c.foreignExchangeCostSource !== undefined
          ? (FX_SOURCE_LABEL[c.foreignExchangeCostSource] ?? c.foreignExchangeCostSource)
          : "—",
      ),
      values: cards.map((c) =>
        c.foreignExchangeCostSource !== undefined
          ? (FX_SOURCE_LABEL[c.foreignExchangeCostSource] ?? c.foreignExchangeCostSource)
          : "—",
      ),
    },
    {
      label: "IOF zero",
      cells: cards.map((c) => (c.hasZeroIof ? "Sim" : "Não")),
      values: cards.map((c) => (c.hasZeroIof ? "Sim" : "Não")),
    },
    ...(cards.some((c) => c.verifiedTier !== undefined)
      ? [
          {
            label: "Verificação",
            cells: cards.map((c) =>
              c.verifiedTier !== undefined ? `Tier ${String(c.verifiedTier)}` : "—",
            ),
            values: cards.map((c) =>
              c.verifiedTier !== undefined ? `Tier ${String(c.verifiedTier)}` : "—",
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3">
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
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-line border-b">
              <th className="w-32 shrink-0" />
              {cards.map((card) => (
                <th key={card.id} className="px-2 py-3 text-left align-bottom">
                  <div className="flex flex-col gap-2">
                    <CardArt brand={card.brand} tier={card.tier} bank={card.bank} size="sm" />
                    <Link
                      to={`/cards/${card.id}`}
                      className="text-subheading text-ink hover:text-accent font-semibold"
                    >
                      {card.name}
                    </Link>
                    <p className="text-caption text-ink-subtle tracking-wide uppercase">
                      {card.bank} · {card.tier}
                    </p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row
                key={row.label}
                label={row.label}
                cells={row.cells}
                {...(row.winners !== undefined ? { winners: row.winners } : {})}
                hidden={hideEqualRows && isEqualRow(row)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
