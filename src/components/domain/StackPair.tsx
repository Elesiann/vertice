import type { JSX } from "react";
import type { CardAllocation, StackEvaluation } from "@/types";

interface StackPairProps {
  stack: StackEvaluation;
}

const formatRate = (value: number): string =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const allocationLabel = (alloc: CardAllocation): string => {
  const parts: string[] = [];
  if (alloc.monthlyDomesticBrl > 0) parts.push("Gasto BRL");
  if (alloc.monthlyInternationalUsd > 0) parts.push("Gasto USD");
  return parts.length > 0 ? parts.join(" + ") : "Standby";
};

const earningLabel = (stackCard: StackEvaluation["cards"][number]): string => {
  if (stackCard.cashbackRatePercent !== undefined) {
    return `${formatRate(stackCard.cashbackRatePercent * 100)}% de cashback sobre BRL + USD (convertido)`;
  }
  if (stackCard.pointsPerUsdDomestic !== undefined) {
    return `${formatRate(stackCard.pointsPerUsdDomestic)} pts/US$ (BRL equivalente) · ${formatRate(stackCard.pointsPerUsdInternational ?? 0)} pts/US$ internacional`;
  }
  if (stackCard.pointsPerUsdInternational !== undefined) {
    return `${formatRate(stackCard.pointsPerBrlDomestic ?? 0)} pts/R$ doméstico · ${formatRate(stackCard.pointsPerUsdInternational)} pts/US$ internacional`;
  }
  return `${formatRate(stackCard.pointsPerBrlDomestic ?? 0)} pts/R$ em gasto doméstico e internacional convertido`;
};

export const StackPair = ({ stack }: StackPairProps): JSX.Element => (
  <section className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Stack recomendado">
    {stack.cards.map((card) => {
      const alloc = stack.allocation.find((a) => a.cardId === card.id);
      return (
        <article
          key={card.id}
          className="rounded-lg border border-ink-subtle/30 bg-surface-raised p-4"
        >
          <h2 className="text-lg font-semibold text-ink">{card.name}</h2>
          <p className="text-sm text-ink-muted">
            {card.bank} · {card.brand} · {card.tier}
          </p>
          <p className="mt-3 text-sm text-ink">
            <span className="font-medium">Recebe:</span>{" "}
            {alloc ? allocationLabel(alloc) : "Standby"}
          </p>
          <p className="mt-1 text-sm text-ink-subtle">{earningLabel(card)}</p>
        </article>
      );
    })}
  </section>
);
