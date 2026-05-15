import type { JSX } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { RevealBlock, RevealGroup } from "@/components/ui/Reveal";
import { ROUTES } from "@/lib/routes-constants";

export const CompareEmpty = (): JSX.Element => (
  <RevealGroup className="mx-auto max-w-2xl px-4 py-16 text-center">
    <RevealBlock>
      <p className="text-display-3 text-ink">Nenhum cartão para comparar</p>
      <p className="text-body-sm text-ink-muted mt-2">
        Selecione 2–4 cartões no catálogo para comparar lado a lado.
      </p>
      <ButtonLink to={ROUTES.CATALOG} className="mt-6 inline-flex" size="md">
        Ir ao catálogo
      </ButtonLink>
    </RevealBlock>
  </RevealGroup>
);
