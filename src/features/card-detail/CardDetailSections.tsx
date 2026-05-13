import { type JSX, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatBrl, formatCashbackRate, formatUsd } from "@/lib/format";
import { formatLoungeProvider, formatPointsProgram } from "@/lib/labels";
import {
  FX_SOURCE_LABEL,
  RELATIONSHIP_LABEL,
  accessCopy,
  effectiveFeeCopy,
  hasInternationalAngle,
  investmentDisambiguationNote,
  loungeCopy,
  pointsExpirationCopy,
  spreadReferenceNote,
  welcomeBonusCopy,
  type CopyTone,
} from "@/features/card-detail/detail-model";
import type { PublicCardDetail, SpendingProfile } from "@/types";

interface CardDetailSectionsProps {
  card: PublicCardDetail;
  profile: SpendingProfile | null;
}

interface DetailRowProps {
  label: string;
  value: ReactNode;
  note?: ReactNode | undefined;
  tone?: CopyTone | undefined;
}

const TONE_CLASS: Record<CopyTone, string> = {
  accent: "text-accent",
  ink: "text-ink",
  muted: "text-ink-muted",
  warning: "text-warning",
};

const formatRate = (value: number): string => `${value.toFixed(2).replace(".", ",")} pts/USD`;

const formatPercent = (value: number): string => `${value.toFixed(2).replace(".", ",")}%`;

const DetailRow = ({ label, value, note, tone = "ink" }: DetailRowProps): JSX.Element => (
  <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-8 gap-y-1.5 py-4">
    <dt className="text-ink-muted text-sm">{label}</dt>
    <dd className={cn("text-num tabular text-right text-sm font-semibold", TONE_CLASS[tone])}>
      {value}
    </dd>
    {note !== undefined ? (
      <p
        className={cn(
          "col-span-2 max-w-prose text-xs leading-relaxed text-pretty",
          tone === "warning" ? "text-warning" : "text-ink-subtle",
        )}
      >
        {note}
      </p>
    ) : null}
  </div>
);

const SectionShell = ({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}): JSX.Element => (
  <section className="border-line border-b py-10" aria-label={title}>
    {eyebrow !== undefined ? <p className="text-caption text-ink-subtle">{eyebrow}</p> : null}
    <h2 className={cn("text-heading text-ink text-balance", eyebrow !== undefined && "mt-1.5")}>
      {title}
    </h2>
    <div className="mt-6 max-w-4xl">{children}</div>
  </section>
);

const RowList = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element => <dl className={cn("divide-line divide-y", className)}>{children}</dl>;

const SubGroup = ({
  label,
  children,
  divided,
}: {
  label: string;
  children: ReactNode;
  divided?: boolean;
}): JSX.Element => (
  <div className={cn("mt-8", divided === true && "border-line border-t pt-7")}>
    <p className="text-ink-subtle text-xs font-medium">{label}</p>
    <RowList className="mt-2">{children}</RowList>
  </div>
);

const accessInvestmentValue = (card: PublicCardDetail): string | null => {
  const brl = card.requiredInvestmentBrl ?? card.minInvestmentBrl;
  if (brl !== undefined) return formatBrl(brl);
  const usd = card.requiredInvestmentUsd ?? card.minInvestmentUsd;
  if (usd !== undefined) return formatUsd(usd);
  return null;
};

export const CardDetailSections = ({ card, profile }: CardDetailSectionsProps): JSX.Element => {
  const accessSummary = accessCopy(card);
  const loungeSummary = loungeCopy(card);
  const effectiveFee = effectiveFeeCopy(card, profile);
  const investmentNote = investmentDisambiguationNote(card);
  const accessInvestment = accessInvestmentValue(card);
  const accessIsInvestment =
    card.requiresRelationship === "investment" || card.requiresRelationship === "private";
  const hasTravel =
    card.loungeAccess !== undefined ||
    card.travelInsuranceLevel !== undefined ||
    card.freeCheckedBaggage === true;
  const spread = card.foreignExchangeSpreadPercent;
  const fxAngle = hasInternationalAngle(card);
  const recurringFeeLabel = `${formatBrl(card.annualFeeBrl)}/ano`;
  // Quando o custo efetivo é a própria anuidade cheia (perfil não atinge a
  // isenção), as duas linhas mostram o mesmo número — então as duas ficam
  // âmbar, em vez de uma âmbar e outra preta.
  const recurringFeeTone: CopyTone = effectiveFee.value === recurringFeeLabel ? "warning" : "ink";
  const notes = card.benefits ?? [];

  return (
    <div>
      <SectionShell eyebrow="Exige?" title="Acesso">
        <RowList>
          <DetailRow
            label="Relacionamento exigido"
            value={RELATIONSHIP_LABEL[card.requiresRelationship ?? "open"]}
            note={investmentNote ?? accessSummary.note}
            tone={accessSummary.tone}
          />
          {accessInvestment !== null && accessIsInvestment ? (
            <DetailRow
              label="Investimento para acesso"
              value={accessInvestment}
              note="Barreira para contratar o cartão."
              tone="warning"
            />
          ) : null}
          {accessInvestment !== null &&
          !accessIsInvestment &&
          card.investmentFeeWaiverBrl === undefined ? (
            <DetailRow
              label="Investimento mínimo"
              value="Não exigido para acesso"
              note={`${accessInvestment} aparece no catálogo como condição financeira, mas não como barreira de contratação deste cartão.`}
              tone="muted"
            />
          ) : null}
        </RowList>
      </SectionShell>

      <SectionShell eyebrow="Anuidade?" title="Custo efetivo">
        <RowList className="border-line border-b pb-2">
          <DetailRow
            label="No seu perfil"
            value={effectiveFee.value}
            note={effectiveFee.note}
            tone={effectiveFee.tone}
          />
        </RowList>
        <SubGroup label="Anuidade">
          <DetailRow
            label="Anuidade recorrente"
            value={recurringFeeLabel}
            tone={recurringFeeTone}
          />
          {card.firstYearAnnualFeeBrl !== undefined ? (
            <DetailRow
              label="Primeiro ano"
              value={formatBrl(card.firstYearAnnualFeeBrl)}
              note={
                card.firstYearAnnualFeeBrl === 0 && card.annualFeeBrl > 0
                  ? `Depois volta para ${formatBrl(card.annualFeeBrl)}/ano.`
                  : undefined
              }
            />
          ) : null}
          {card.annualFeeWaiverThresholdBrl !== undefined ? (
            <DetailRow
              label="Isenção por gasto"
              value={`${formatBrl(card.annualFeeWaiverThresholdBrl)}/mês`}
              tone="warning"
            />
          ) : null}
          {card.investmentFeeWaiverBrl !== undefined ? (
            <DetailRow
              label="Isenção por investimento"
              value={formatBrl(card.investmentFeeWaiverBrl)}
              tone="warning"
            />
          ) : null}
        </SubGroup>
        {fxAngle ? (
          <SubGroup label="Câmbio" divided>
            <DetailRow label="IOF" value={card.hasZeroIof ? "Zero" : "Padrão"} />
            <DetailRow
              label="Spread cambial"
              value={spread !== undefined ? formatPercent(spread) : "Não informado"}
              note={spread !== undefined ? spreadReferenceNote(spread) : undefined}
              tone={spread !== undefined ? "ink" : "muted"}
            />
            {card.foreignExchangeCostSource !== undefined ? (
              <DetailRow
                label="Fonte do custo de câmbio"
                value={
                  FX_SOURCE_LABEL[card.foreignExchangeCostSource] ?? card.foreignExchangeCostSource
                }
              />
            ) : null}
          </SubGroup>
        ) : (
          <div className="border-line mt-8 border-t pt-7">
            <p className="text-ink-subtle text-sm leading-relaxed text-pretty">
              IOF padrão. Spread cambial não informado no catálogo.
            </p>
          </div>
        )}
      </SectionShell>

      <SectionShell eyebrow="Ganhos?" title="Retorno e viagem">
        <RowList>
          {card.pointsProgram !== "cashback" ? (
            <DetailRow label="Programa" value={formatPointsProgram(card.pointsProgram)} />
          ) : null}
          {card.cashbackRatePercent !== undefined ? (
            <DetailRow
              label={card.hasInvestback === true ? "Investback" : "Cashback"}
              value={formatCashbackRate(card.cashbackRatePercent)}
              note={
                card.hasInvestback === true
                  ? "Tratado separadamente de cashback direto porque o retorno fica aplicado no emissor."
                  : undefined
              }
            />
          ) : null}
          {card.pointsPerUsdDomestic !== undefined ? (
            <DetailRow label="Pontuação nacional" value={formatRate(card.pointsPerUsdDomestic)} />
          ) : null}
          {card.pointsPerUsdInternational !== undefined ? (
            <DetailRow
              label="Pontuação internacional"
              value={formatRate(card.pointsPerUsdInternational)}
            />
          ) : null}
          {card.welcomeBonusPoints !== undefined ? (
            <DetailRow
              label="Bônus de entrada"
              value={welcomeBonusCopy(card.welcomeBonusPoints)}
              note="Bônus público do catálogo; a regra de elegibilidade pode depender de campanha."
            />
          ) : null}
          {card.pointsExpirationMonths !== undefined && card.pointsProgram !== "cashback" ? (
            <DetailRow
              label="Expiração de pontos"
              value={pointsExpirationCopy(card.pointsExpirationMonths)}
            />
          ) : null}
          {hasTravel && loungeSummary !== null ? (
            <DetailRow
              label="Salas VIP"
              value={loungeSummary.value}
              note={loungeSummary.note}
              tone={loungeSummary.tone}
            />
          ) : null}
          {card.loungeAccess !== undefined && card.loungeAccess.providers.length > 0 ? (
            <DetailRow
              label="Redes aceitas"
              value={card.loungeAccess.providers.map(formatLoungeProvider).join(" · ")}
            />
          ) : null}
          {card.loungeAccess?.conditionalMonthlySpendBrl !== undefined ? (
            <DetailRow
              label="Gasto para liberar sala"
              value={`${formatBrl(card.loungeAccess.conditionalMonthlySpendBrl)}/mês`}
              tone="warning"
            />
          ) : null}
          {card.travelInsuranceLevel !== undefined ? (
            <DetailRow
              label="Seguro viagem"
              value={card.travelInsuranceLevel === "premium" ? "Premium" : "Básico"}
            />
          ) : null}
          {card.freeCheckedBaggage === true ? (
            <DetailRow label="Bagagem" value="Bagagem despachada incluída" />
          ) : null}
        </RowList>
      </SectionShell>

      {notes.length > 0 ? (
        <SectionShell title="Notas do catálogo">
          <ul className="max-w-prose space-y-3">
            {notes.map((note) => (
              <li
                key={note.label}
                className="text-ink-muted font-display flex gap-2.5 text-[0.8125rem] leading-relaxed text-pretty"
              >
                <span aria-hidden className="text-ink-subtle">
                  —
                </span>
                <span>{note.label}</span>
              </li>
            ))}
          </ul>
        </SectionShell>
      ) : null}
    </div>
  );
};
