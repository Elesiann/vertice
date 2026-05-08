import type { JSX } from "react";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/routes";

export const CompareEmpty = (): JSX.Element => (
  <div className="mx-auto max-w-2xl px-4 py-16 text-center">
    <Panel tone="raised" className="p-10">
      <p className="text-heading text-ink">Nenhum cartão para comparar</p>
      <p className="text-body-sm text-ink-muted mt-2">
        Selecione 2–4 cartões no catálogo para comparar lado a lado.
      </p>
      <ButtonLink to={ROUTES.CATALOG} className="mt-6 inline-flex" size="md">
        Ir ao catálogo
      </ButtonLink>
    </Panel>
  </div>
);
