import type { JSX } from "react";
import { Link } from "react-router-dom";
import { DuplicatesBanner } from "@/components/domain/DuplicatesBanner";
import { TotalsCard } from "@/components/domain/TotalsCard";
import { useParsedSession } from "@/hooks/useParsedSession";

export const ReviewView = (): JSX.Element => {
  const { aggregate, transactions } = useParsedSession();

  if (transactions.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-center">
        <h1 className="text-2xl font-semibold text-ink">Nenhuma transação ainda</h1>
        <p className="mt-2 text-ink-muted">Suba pelo menos uma fatura pra ver a análise.</p>
        <Link
          to="/upload"
          className="mt-4 inline-block rounded-md text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Ir para upload →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Análise</h1>
        <p className="mt-1 text-ink-muted">
          Tudo calculado localmente. Nenhum dado saiu do seu navegador.
        </p>
      </header>

      <DuplicatesBanner count={aggregate.duplicatesRemoved} />

      <TotalsCard aggregate={aggregate} />
    </div>
  );
};
