import type { JSX } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export const HomePage = (): JSX.Element => (
  <ErrorBoundary>
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <h1 className="text-4xl font-bold text-ink sm:text-5xl">stackr</h1>
      <p className="mt-4 text-xl text-ink-muted">
        Encontre seu stack ótimo de cartões brasileiros. Suba suas faturas, veja o math, decida.
      </p>
      <p className="mt-2 text-ink-subtle">
        Tudo acontece no seu navegador. Sem login, sem upload pra servidor, sem rastreamento.
      </p>
      <div className="mt-8">
        <ButtonLink to="/upload">Começar →</ButtonLink>
      </div>
    </main>
  </ErrorBoundary>
);
