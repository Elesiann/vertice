import type { JSX } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageMeta } from "@/components/seo/PageMeta";
import { ROUTES } from "@/lib/routes-constants";

export const NotFoundPage = (): JSX.Element => (
  <main className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
    <PageMeta
      title="Página não encontrada — Vértice"
      description="O endereço solicitado não existe no Vértice."
      noindex
    />
    <p className="text-ink-muted text-sm font-medium tracking-wider uppercase">404</p>
    <h1 className="text-display-3 text-ink mt-2">Página não encontrada.</h1>
    <p className="text-body text-ink-muted mt-3">
      O endereço solicitado não existe no Vértice. Volte para a home ou abra o catálogo.
    </p>
    <div className="mt-6 flex flex-wrap gap-3">
      <ButtonLink to={ROUTES.HOME}>Voltar para a home</ButtonLink>
      <ButtonLink to={ROUTES.CATALOG} variant="secondary">
        Ver catálogo
      </ButtonLink>
    </div>
  </main>
);
