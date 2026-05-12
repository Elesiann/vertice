import type { JSX, ReactNode } from "react";
import { formatBrl, formatPoints } from "@/lib/format";
import { formatPointsProgram } from "@/lib/labels";
import type { TravelTranslation as TravelTranslationData } from "@/types";

const CABIN_LABEL = {
  economy: "econômica",
  "premium-economy": "premium economy",
  business: "executiva",
} as const;

const Shell = ({ children }: { children: ReactNode }): JSX.Element => (
  <section
    className="border-line bg-surface-sunken rounded-md border p-4"
    aria-label="Tradução em viagens"
  >
    <p className="text-ink-muted text-sm font-medium">Isso vira</p>
    {children}
  </section>
);

export const TravelTranslation = ({
  translation,
}: {
  translation: TravelTranslationData;
}): JSX.Element => {
  if (translation.kind === "cashback") {
    return (
      <Shell>
        <p className="text-ink mt-1 text-xl font-semibold">
          {formatBrl(translation.valueBrl)} de cashback
        </p>
        <p className="text-ink-subtle mt-1 text-xs">Valor estimado em 12 meses.</p>
      </Shell>
    );
  }

  if (translation.kind === "value") {
    return (
      <Shell>
        <p className="text-ink mt-1 text-xl font-semibold">≈ {formatBrl(translation.valueBrl)}</p>
        <p className="text-ink-muted text-sm">
          em pontos {formatPointsProgram(translation.program)} por ano
        </p>
        <p className="text-ink-subtle mt-1 text-xs">
          Pontos: {formatPoints(translation.compatiblePoints)}
        </p>
      </Shell>
    );
  }

  const {
    trips,
    fromLabel,
    toLabel,
    cabin,
    roundTrip,
    viaProgram,
    remainingPoints,
    compatiblePoints,
  } = translation;
  return (
    <Shell>
      <p className="text-ink mt-1 text-xl font-semibold">
        {trips} {trips === 1 ? "passagem" : "passagens"}
      </p>
      <p className="text-ink-muted text-sm">
        {fromLabel} → {toLabel} · {CABIN_LABEL[cabin]} · {roundTrip ? "ida e volta" : "só ida"}
      </p>
      {viaProgram ? (
        <p className="text-ink-subtle mt-1 text-xs">
          transferindo 1:1 para {formatPointsProgram(viaProgram)}
        </p>
      ) : null}
      <p className="text-ink-subtle mt-1 text-xs">
        Pontos compatíveis: {formatPoints(compatiblePoints)}
      </p>
      {remainingPoints > 0 ? (
        <p className="text-ink-subtle mt-1 text-xs">
          Sobra: {formatPoints(remainingPoints)} pontos
        </p>
      ) : null}
    </Shell>
  );
};
