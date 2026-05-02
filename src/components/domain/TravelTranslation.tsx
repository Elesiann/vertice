import type { JSX } from "react";
import type { TravelTranslation as TravelTranslationData } from "@/types";

interface TravelTranslationProps {
  translation: TravelTranslationData;
}

export const TravelTranslation = ({ translation }: TravelTranslationProps): JSX.Element => (
  <section
    className="rounded-md border border-accent/30 bg-accent/5 p-4 text-center"
    aria-label="Tradução em viagens"
  >
    <p className="text-sm uppercase tracking-wide text-ink-muted">Isso vira</p>
    <p className="mt-1 text-xl font-semibold text-ink">
      {translation.trips} {translation.trips === 1 ? "passagem" : "passagens"}
    </p>
    <p className="text-sm text-ink-muted">{translation.flight}</p>
    {translation.remainingPoints > 0 ? (
      <p className="mt-1 text-xs text-ink-subtle">
        Sobra: {translation.remainingPoints.toLocaleString("pt-BR")} pontos
      </p>
    ) : null}
  </section>
);
