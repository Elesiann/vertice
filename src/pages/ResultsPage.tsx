import type { JSX } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PageMeta } from "@/components/seo/PageMeta";
import { ResultsView } from "@/features/results/ResultsView";

export const ResultsPage = (): JSX.Element => (
  <ErrorBoundary>
    <PageMeta
      title="Seu resultado — Vértice"
      description="Resultado do cálculo de cartão para seu perfil."
      noindex
    />
    <ResultsView />
  </ErrorBoundary>
);
