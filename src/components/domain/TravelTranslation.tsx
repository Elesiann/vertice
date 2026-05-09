import type { JSX } from "react";
import { formatBrl, formatPoints } from "@/lib/format";
import type { TravelTranslation as TravelTranslationData } from "@/types";

interface TravelTranslationProps {
  translation: TravelTranslationData;
}

export const TravelTranslation = ({ translation }: TravelTranslationProps): JSX.Element => (
  <section
    className="border-line bg-surface-sunken rounded-md border p-4"
    aria-label="Tradução em viagens"
  >
    <p className="text-ink-muted text-sm font-medium">Isso vira</p>
    {translation.program === "cashback" ? (
      <p className="text-ink mt-1 text-xl font-semibold">
        {formatBrl(translation.compatiblePoints)} de cashback
      </p>
    ) : translation.trips > 0 ? (
      <p className="text-ink mt-1 text-xl font-semibold">
        {translation.trips} {translation.trips === 1 ? "passagem" : "passagens"}
      </p>
    ) : (
      <p className="text-ink mt-1 text-xl font-semibold">Abaixo de uma passagem</p>
    )}
    <p className="text-ink-muted text-sm">{translation.flight}</p>
    {translation.program === "cashback" ? (
      <p className="text-ink-subtle mt-1 text-xs">Valor estimado em 12 meses.</p>
    ) : (
      <>
        <p className="text-ink-subtle mt-1 text-xs">
          Pontos compatíveis: {formatPoints(translation.compatiblePoints)}
        </p>
        {translation.trips === 0 && translation.pointsRequired > translation.compatiblePoints ? (
          <p className="text-ink-subtle mt-1 text-xs">
            Faltam {formatPoints(translation.pointsRequired - translation.compatiblePoints)} pontos
            para a próxima passagem.
          </p>
        ) : translation.remainingPoints > 0 ? (
          <p className="text-ink-subtle mt-1 text-xs">
            Sobra: {formatPoints(translation.remainingPoints)} pontos
          </p>
        ) : null}
      </>
    )}
  </section>
);
