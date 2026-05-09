import type { JSX } from "react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { FeeWaiverBadge } from "@/components/domain/FeeWaiverBadge";
import { formatBrl, formatCashbackRate } from "@/lib/format";
import type { PublicCardDetail } from "@/types";

const FX_SOURCE_LABEL: Record<string, string> = {
  official: "Spread oficial",
  secondary: "Estimado por fonte secundária",
  assumption: "Estimado",
  mixed: "Misto",
};

const VERIFIED_TIER_LABEL: Record<number, string> = {
  1: "Verificado em alta confiança",
  2: "Verificado em média confiança",
  3: "Verificado em baixa confiança",
};

interface CardDetailSectionsProps {
  card: PublicCardDetail;
}

export const CardDetailSections = ({ card }: CardDetailSectionsProps): JSX.Element => {
  const hasTravel =
    card.loungeAccess !== undefined ||
    card.travelInsuranceLevel !== undefined ||
    card.freeCheckedBaggage === true;

  const hasVerification = card.verifiedTier !== undefined || card.lastVerified !== undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* Anuidade */}
      <Panel tone="raised" as="section" aria-labelledby="section-anuidade" className="p-4 sm:p-6">
        <h2 id="section-anuidade" className="text-heading text-ink mb-4">
          Anuidade
        </h2>
        <dl className="flex flex-col gap-3">
          <Stat label="Anuidade recorrente" value={formatBrl(card.annualFeeBrl)} />
          {card.firstYearAnnualFeeBrl !== undefined && (
            <Stat label="Primeiro ano" value={formatBrl(card.firstYearAnnualFeeBrl)} />
          )}
          {(card.annualFeeWaiverThresholdBrl !== undefined ||
            card.investmentFeeWaiverBrl !== undefined) && (
            <div className="flex flex-col gap-1">
              <dt className="text-ink-subtle text-sm">Isenção</dt>
              <dd>
                <FeeWaiverBadge
                  {...(card.annualFeeWaiverThresholdBrl !== undefined
                    ? { annualFeeWaiverThresholdBrl: card.annualFeeWaiverThresholdBrl }
                    : {})}
                  {...(card.investmentFeeWaiverBrl !== undefined
                    ? { investmentFeeWaiverBrl: card.investmentFeeWaiverBrl }
                    : {})}
                />
              </dd>
            </div>
          )}
        </dl>
      </Panel>

      {/* Retorno */}
      <Panel tone="raised" as="section" aria-labelledby="section-retorno" className="p-4 sm:p-6">
        <h2 id="section-retorno" className="text-heading text-ink mb-4">
          Retorno
        </h2>
        <dl className="flex flex-col gap-3">
          <Stat label="Programa" value={card.pointsProgram} />
          {card.pointsPerUsdDomestic !== undefined && (
            <Stat
              label="Pontos por USD (nacional)"
              value={`${card.pointsPerUsdDomestic.toFixed(2)} pts`}
            />
          )}
          {card.pointsPerUsdInternational !== undefined && (
            <Stat
              label="Pontos por USD (internacional)"
              value={`${card.pointsPerUsdInternational.toFixed(2)} pts`}
            />
          )}
          {card.cashbackRatePercent !== undefined && (
            <Stat
              label={card.hasInvestback ? "Investback" : "Cashback"}
              value={formatCashbackRate(card.cashbackRatePercent)}
            />
          )}
          {card.pointsExpirationMonths !== undefined && (
            <Stat
              label="Expiração de pontos"
              value={
                card.pointsExpirationMonths === 0
                  ? "Não expiram"
                  : `${String(card.pointsExpirationMonths)} meses`
              }
            />
          )}
        </dl>
      </Panel>

      {/* Viagem */}
      {hasTravel && (
        <Panel tone="raised" as="section" aria-labelledby="section-viagem" className="p-4 sm:p-6">
          <h2 id="section-viagem" className="text-heading text-ink mb-4">
            Viagem
          </h2>
          <dl className="flex flex-col gap-3">
            {card.loungeAccess !== undefined && (
              <>
                <Stat
                  label="Acesso a salas VIP"
                  value={
                    card.loungeAccess.unlimited === true
                      ? "Ilimitado"
                      : card.loungeAccess.visitsPerYear !== undefined
                        ? `${String(card.loungeAccess.visitsPerYear)} visitas/ano`
                        : card.loungeAccess.conditional === true
                          ? "Condicional"
                          : "Incluído"
                  }
                />
                {card.loungeAccess.conditionalMonthlySpendBrl !== undefined && (
                  <Stat
                    label="Gasto mínimo para acesso"
                    value={formatBrl(card.loungeAccess.conditionalMonthlySpendBrl) + "/mês"}
                  />
                )}
                {card.loungeAccess.providers.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <dt className="text-ink-subtle text-sm">Redes aceitas</dt>
                    <dd className="flex flex-wrap gap-2">
                      {card.loungeAccess.providers.map((p) => (
                        <Badge key={p} tone="neutral">
                          {p}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                )}
              </>
            )}
            {card.travelInsuranceLevel !== undefined && (
              <Stat
                label="Seguro viagem"
                value={card.travelInsuranceLevel === "premium" ? "Premium" : "Basic"}
              />
            )}
            {card.freeCheckedBaggage === true && (
              <Stat label="Bagagem" value="Bagagem grátis incluída" />
            )}
          </dl>
        </Panel>
      )}

      {/* Internacional */}
      <Panel
        tone="raised"
        as="section"
        aria-labelledby="section-internacional"
        className="p-4 sm:p-6"
      >
        <h2 id="section-internacional" className="text-heading text-ink mb-4">
          Internacional
        </h2>
        <dl className="flex flex-col gap-3">
          {card.foreignExchangeCostSource !== undefined && (
            <Stat
              label="Fonte do spread"
              value={
                FX_SOURCE_LABEL[card.foreignExchangeCostSource] ?? card.foreignExchangeCostSource
              }
            />
          )}
          <Stat label="IOF zero" value={card.hasZeroIof ? "Sim" : "Não"} />
          {card.foreignExchangeSpreadPercent !== undefined && (
            <Stat
              label="Spread cambial"
              value={`${card.foreignExchangeSpreadPercent.toFixed(2)}%`}
            />
          )}
        </dl>
      </Panel>

      {/* Verificação */}
      {hasVerification && (
        <Panel
          tone="raised"
          as="section"
          aria-labelledby="section-verificacao"
          className="p-4 sm:p-6"
        >
          <h2 id="section-verificacao" className="text-heading text-ink mb-4">
            Verificação
          </h2>
          <dl className="flex flex-col gap-3">
            {card.verifiedTier !== undefined && (
              <Stat
                label="Nível de verificação"
                value={VERIFIED_TIER_LABEL[card.verifiedTier] ?? String(card.verifiedTier)}
              />
            )}
            {card.lastVerified !== undefined && (
              <Stat
                label="Última verificação"
                value={new Date(card.lastVerified).toLocaleDateString("pt-BR")}
              />
            )}
          </dl>
        </Panel>
      )}
    </div>
  );
};
