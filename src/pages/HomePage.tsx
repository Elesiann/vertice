import type { JSX } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ROUTES } from "@/routes";

export const HomePage = (): JSX.Element => (
  <ErrorBoundary>
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <h1 className="text-display-1 text-ink">stackr</h1>
      <p className="text-ink-muted mt-4 max-w-2xl text-lg leading-relaxed">
        Encontre seu stack ótimo de cartões brasileiros. Diga seu gasto, veja quanto você está
        deixando de ganhar em pontos, decida.
      </p>
      <p className="text-ink-subtle mt-2 text-sm">
        Tudo acontece no seu navegador. Sem login, sem upload pra servidor, sem rastreamento.
      </p>
      <div className="mt-8">
        <ButtonLink to={ROUTES.INPUT}>Começar →</ButtonLink>
      </div>
    </main>
  </ErrorBoundary>
);
