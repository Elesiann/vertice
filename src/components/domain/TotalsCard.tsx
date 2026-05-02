import type { JSX } from "react";
import type { SpendingAggregate } from "@/types";

interface TotalsCardProps {
  aggregate: SpendingAggregate;
}

const formatBrl = (amount: number): string =>
  amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatUsd = (amount: number): string =>
  amount.toLocaleString("en-US", { style: "currency", currency: "USD" });

const formatMonths = (months: number): string =>
  months < 1 ? "menos de 1 mês" : `${months.toFixed(1)} meses`;

export const TotalsCard = ({ aggregate }: TotalsCardProps): JSX.Element => (
  <section
    className="rounded-lg border border-ink-subtle/30 bg-surface-raised p-6"
    aria-label="Resumo de gastos"
  >
    <header className="mb-4">
      <h2 className="text-lg font-semibold text-ink">Resumo</h2>
      <p className="text-sm text-ink-muted">
        {aggregate.periodStart} até {aggregate.periodEnd} · {formatMonths(aggregate.monthsCovered)}
      </p>
    </header>
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <dt className="text-sm text-ink-muted">Gasto doméstico (BRL)</dt>
        <dd className="text-2xl font-semibold text-ink">{formatBrl(aggregate.totalDomesticBrl)}</dd>
        <dd className="text-sm text-ink-subtle">
          {formatBrl(aggregate.monthlyAvgDomesticBrl)} / mês
        </dd>
      </div>
      <div>
        <dt className="text-sm text-ink-muted">Gasto internacional (USD)</dt>
        <dd className="text-2xl font-semibold text-ink">
          {formatUsd(aggregate.totalInternationalUsd)}
        </dd>
        <dd className="text-sm text-ink-subtle">
          {formatUsd(aggregate.monthlyAvgInternationalUsd)} / mês · PTAX{" "}
          {aggregate.ptaxRateUsed.toFixed(2)}
        </dd>
      </div>
    </dl>
    <p className="mt-4 text-sm text-ink-subtle">
      {aggregate.transactionCount} transações analisadas.
    </p>
  </section>
);
