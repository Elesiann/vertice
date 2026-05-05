import type { JSX } from "react";
import { formatBrl, formatPoints } from "@/lib/format";
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
    {translation.program === "cashback" ? (
      <p className="mt-1 text-xl font-semibold text-ink">
        {formatBrl(translation.compatiblePoints)} de cashback
      </p>
    ) : (
      <p className="mt-1 text-xl font-semibold text-ink">
        {translation.trips} {translation.trips === 1 ? "passagem" : "passagens"}
      </p>
    )}
    <p className="text-sm text-ink-muted">{translation.flight}</p>
    {translation.program === "cashback" ? (
      <p className="mt-1 text-xs text-ink-subtle">
        Valor compatível: {formatBrl(translation.compatiblePoints)}
      </p>
    ) : (
      <>
        <p className="mt-1 text-xs text-ink-subtle">
          Pontos compatíveis: {formatPoints(translation.compatiblePoints)}
        </p>
        {translation.remainingPoints > 0 ? (
          <p className="mt-1 text-xs text-ink-subtle">
            Sobra: {formatPoints(translation.remainingPoints)} pontos
          </p>
        ) : null}
      </>
    )}
  </section>
);
