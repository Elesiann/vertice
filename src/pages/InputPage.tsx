import type { JSX } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PageMeta } from "@/components/seo/PageMeta";
import { InputForm } from "@/features/input/InputForm";

export const InputPage = (): JSX.Element => (
  <ErrorBoundary>
    <PageMeta
      title="Calcular meu stack — Vértice"
      description="Informe seu gasto mensal e perfil de uso. O Vértice calcula o cartão com maior retorno líquido em segundos."
    />
    <InputForm />
  </ErrorBoundary>
);
