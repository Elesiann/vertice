import { type JSX } from "react";
import { Link } from "react-router-dom";
import { BackLink } from "@/components/ui/BackLink";
import { FeeTierBadge } from "@/components/domain/FeeTierBadge";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Disclosure } from "@/components/ui/Disclosure";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { useSession } from "@/context/SessionContext";
import { useRecommendation } from "@/hooks/useRecommendation";
import { useStackBenefits } from "@/hooks/useStackBenefits";
import { buildErrorReportUrl } from "@/lib/feedback";
import { formatBrl, formatPoints } from "@/lib/format";
import { formatPointsProgram } from "@/lib/labels";
import { whyWonSentences } from "@/lib/why-won";
import { CurrentVsRecommended } from "@/features/results/CurrentVsRecommended";
import {
  PreferencePanel,
  type PreferenceComparison,
  type PreferenceComparisonRow,
} from "@/features/results/PreferencePanel";
import { buildComparisonNarrative } from "@/lib/comparison-narrative";
import { ROUTES } from "@/routes";
import {
  MILES_PROGRAMS,
  alternativesHeroSentence,
  bestUpsideForCurrentCard,
  buildAlternativeTabs,
  comparisonThreshold,
  compareCandidate,
  currentCardIsBest,
  formatAnnualBrl,
  isAccessibleForProfile,
  preferenceLabel,
  primaryProgram,
  programRedemptionLabel,
  stackAccessBarrierLabel,
  stackAccessBarrierPhrase,
  stackId,
  stackLabel,
  stackMatchesPreference,
  transferBonusOptimisticNetBrl,
} from "@/features/results/alternatives";
import { AlternativesSection } from "@/features/results/AlternativesSection";
import { CalculationBreakdown } from "@/features/results/CalculationBreakdown";
import { HeroDetailLinks } from "@/features/results/HeroDetailLinks";
import { StackLabelLink } from "@/features/results/StackLabelLink";
import { displayStackFor, displayStackForProfile } from "@/features/results/display-recommendation";
import type { Recommendation, SpendingProfile, StackEvaluation } from "@/types";

const VERDICT_TONE: Record<"strong" | "viable" | "negative", "accent" | "neutral" | "warning"> = {
  strong: "accent",
  viable: "neutral",
  negative: "warning",
};

const verdictLabel = (
  kind: NonNullable<StackEvaluation["scoreLab"]>["verdict"]["kind"],
): string => {
  if (kind === "strong") return "Retorno alto";
  if (kind === "viable") return "Retorno positivo";
  return "Retorno negativo";
};

// One card-of-the-preferred-currency row in the preference panel — the access note comes from the
// stack's investment/relationship barrier.
const preferenceRow = (
  stack: StackEvaluation,
  role: string,
  warn: boolean,
): PreferenceComparisonRow => {
  const phrase = stackAccessBarrierPhrase(stack);
  return {
    label: stackLabel(stack),
    role,
    note: phrase === null ? "Sem barreira de acesso" : `Exige ${phrase}`,
    warn: warn && phrase !== null,
    netBrl: stack.yearOneNetValueBrl,
    recommended: false,
  };
};

// Builds the "Sobre sua preferência por X" panel data when the recommended card earns in a
// different currency than the one the user picked. null when there's nothing to explain.
const preferenceDivergenceComparison = (
  profile: SpendingProfile,
  recommendation: Recommendation,
  threshold: number,
): PreferenceComparison | null => {
  if (profile.redemption.kind === "any") return null;
  const top = recommendation.topStack;
  if (stackMatchesPreference(top, profile.redemption)) return null;

  const prefLabel = preferenceLabel(profile.redemption);
  const recProgram = primaryProgram(top);
  const recRedemption = programRedemptionLabel(recProgram);
  const recCurrencyWord =
    recProgram === "cashback"
      ? "cashback"
      : recProgram !== undefined && MILES_PROGRAMS.has(recProgram)
        ? "milhas"
        : "pontos";
  const recBarrier = stackAccessBarrierLabel(top); // "exige …" | null
  const recommendedRow: PreferenceComparisonRow = {
    label: stackLabel(top),
    role: `${recCurrencyWord}, recomendado`,
    note:
      recBarrier === null
        ? "Maior líquido total, sem barreira de acesso"
        : `Maior líquido total — ${recBarrier}`,
    warn: false,
    netBrl: top.yearOneNetValueBrl,
    recommended: true,
  };

  const matching = recommendation.alternatives
    .filter((stack) => stackMatchesPreference(stack, profile.redemption))
    .sort(compareCandidate);

  // 1 — no card of the preferred currency among the alternatives at all.
  if (matching.length === 0) {
    return {
      preferenceLabel: prefLabel,
      recRedemption,
      intro: `O recomendado rende em ${recRedemption}, não ${prefLabel}. Nenhum cartão de ${prefLabel} chega a ${formatAnnualBrl(threshold)} do retorno dele.`,
      rows: [recommendedRow],
    };
  }

  const bestActionable = matching.find((stack) => isAccessibleForProfile(profile, stack));
  const bestGated = matching.find((stack) => !isAccessibleForProfile(profile, stack));
  const recNet = top.yearOneNetValueBrl;
  const intro = `O recomendado rende em ${recRedemption}, não ${prefLabel} puro. Aqui está como ele se compara aos melhores cartões de ${prefLabel}:`;

  // 5 — cards of the preferred currency exist, but none is reachable for this profile.
  if (bestActionable === undefined) {
    if (bestGated === undefined) return null; // unreachable: `matching` is non-empty and all gated
    return {
      preferenceLabel: prefLabel,
      recRedemption,
      intro,
      rows: [preferenceRow(bestGated, `${prefLabel} maior`, true), recommendedRow],
    };
  }

  // 4 — a reachable card of the preferred currency ties or beats the recommendation (rare).
  if (bestActionable.yearOneNetValueBrl >= recNet) {
    return {
      preferenceLabel: prefLabel,
      recRedemption,
      intro,
      rows: [preferenceRow(bestActionable, `melhor ${prefLabel} acionável`, false), recommendedRow],
    };
  }

  // 3 — the reachable card is below the recommendation, but a higher one sits behind a gate.
  if (bestGated !== undefined && bestGated.yearOneNetValueBrl > bestActionable.yearOneNetValueBrl) {
    return {
      preferenceLabel: prefLabel,
      recRedemption,
      intro,
      rows: [
        preferenceRow(bestActionable, `melhor ${prefLabel} acionável`, false),
        preferenceRow(bestGated, `${prefLabel} maior`, true),
        recommendedRow,
      ],
    };
  }

  // 2 — the reachable card is below the recommendation, with nothing better behind a gate.
  return {
    preferenceLabel: prefLabel,
    recRedemption,
    intro,
    rows: [preferenceRow(bestActionable, `melhor ${prefLabel} acionável`, false), recommendedRow],
  };
};

const recommendationWithTopStack = (
  recommendation: Recommendation,
  topStack: StackEvaluation,
): Recommendation =>
  stackId(topStack) === stackId(recommendation.topStack)
    ? recommendation
    : { ...recommendation, topStack };

export const ResultsView = (): JSX.Element => {
  const { profile } = useSession();
  const result = useRecommendation();
  const recommendedBenefits = useStackBenefits(
    result?.ok ? displayStackFor(result.value) : undefined,
  );

  if (profile === null) {
    return (
      <main className="app-shell">
        <div className="app-container max-w-3xl">
          <Panel className="space-y-4 p-6 text-center sm:p-8">
            <h1 className="text-display-3 text-ink">Nada para mostrar ainda</h1>
            <p className="text-ink-muted text-sm">Preencha seus dados para gerar a recomendação.</p>
            <div>
              <ButtonLink to={ROUTES.INPUT}>Ir para o formulário</ButtonLink>
            </div>
          </Panel>
        </div>
      </main>
    );
  }

  if (result === null) {
    return (
      <main className="app-shell">
        <div className="app-container max-w-3xl">
          <Panel className="text-ink-muted p-6 text-center sm:p-8">
            Calculando recomendação...
          </Panel>
        </div>
      </main>
    );
  }

  if (!result.ok) {
    return (
      <main className="app-shell">
        <div className="app-container max-w-3xl">
          <Panel className="space-y-4 p-6 text-center sm:p-8">
            <h1 className="text-display-3 text-ink">Não conseguimos recomendar</h1>
            <p className="text-ink-muted text-sm">{result.error.message}</p>
            <div>
              <Link to={ROUTES.INPUT} className="plain-link">
                Voltar e ajustar os dados
              </Link>
            </div>
          </Panel>
        </div>
      </main>
    );
  }

  const recommendation = result.value;
  const scoreLabMeta = recommendation.scoreLab;
  const decisionTracks = scoreLabMeta?.decisionTracks;
  // When the user already holds the highest-net stack on offer, reframe the whole page around their
  // current card (it becomes "the subject") instead of pitching the engine's lower-net pick.
  const isCurrentCardBest = currentCardIsBest(recommendation, profile);
  const topStack = displayStackForProfile(recommendation, profile);
  const currentCardUpside = isCurrentCardBest
    ? bestUpsideForCurrentCard(recommendation, profile)
    : null;
  const displayRecommendation = recommendationWithTopStack(recommendation, topStack);
  const scoreLab = topStack.scoreLab;
  const whyWonNarrative = whyWonSentences(topStack, recommendation.alternatives);
  const heroWaiverHint = ((): "spend" | "investment" | undefined => {
    const benefit = topStack.scoreLab?.benefitsApplied.find(
      (b) => b.kind === "annual-fee-waiver" && b.valueBrl > 0,
    );
    const requirement = benefit?.requirement;
    if (requirement === undefined) return undefined;
    if (requirement.kind === "spend-fee-waiver") return "spend";
    if (requirement.kind === "investment-fee-waiver") return "investment";
    return undefined;
  })();
  const recommendedAccessLabel = stackAccessBarrierLabel(topStack) ?? "sem exigência financeira";
  const threshold = comparisonThreshold(topStack);
  const alternativeTabs = buildAlternativeTabs(displayRecommendation, profile);
  const divergenceComparison = isCurrentCardBest
    ? null
    : preferenceDivergenceComparison(profile, displayRecommendation, threshold);
  const noRecommendationReason =
    decisionTracks?.recommendedNow === null ? decisionTracks.noRecommendationReason : undefined;
  const recommendationEyebrow = isCurrentCardBest
    ? "Você já está no ótimo"
    : noRecommendationReason !== undefined
      ? "Melhor acionável encontrado"
      : "Cartão recomendado";
  const noRecommendationNotice =
    noRecommendationReason === "no-positive-actionable-return"
      ? "Não encontramos uma recomendação acionável com retorno positivo relevante; exibindo o melhor cartão acionável para comparação."
      : noRecommendationReason === "insufficient-access-data"
        ? "Faltam dados para confirmar acesso em alguns cartões; exibindo o melhor cartão acionável conhecido."
        : null;
  const benefitBreakdown = scoreLab?.modeledAnnual.benefitBreakdown;
  const benefitParts =
    benefitBreakdown !== undefined
      ? [
          benefitBreakdown.lounge.totalBrl > 0
            ? `sala VIP ${formatBrl(benefitBreakdown.lounge.totalBrl)}`
            : null,
          benefitBreakdown.insurance.totalBrl > 0
            ? `seguro ${formatBrl(benefitBreakdown.insurance.totalBrl)}`
            : null,
          benefitBreakdown.baggage.totalBrl > 0
            ? `bagagem ${formatBrl(benefitBreakdown.baggage.totalBrl)}`
            : null,
        ].filter((part): part is string => part !== null)
      : [];
  const displayMoneyOnTheTableBrl =
    recommendation.currentStack !== undefined
      ? Math.max(0, topStack.yearOneNetValueBrl - recommendation.currentStack.yearOneNetValueBrl)
      : recommendation.moneyOnTheTableBrl;

  const hasCurrentComparison =
    !isCurrentCardBest &&
    (profile.currentCardIds?.length ?? 0) > 0 &&
    recommendation.currentStack !== undefined &&
    displayMoneyOnTheTableBrl !== undefined &&
    displayMoneyOnTheTableBrl > 0;

  const heroNotes = [
    noRecommendationNotice,
    alternativeTabs.length < 2 ? alternativesHeroSentence(alternativeTabs, threshold) : null,
  ].filter((note): note is string => note !== null);
  const heroRedemption =
    stackId(topStack) === stackId(recommendation.topStack) &&
    recommendation.travelTranslation.kind === "redemption"
      ? recommendation.travelTranslation
      : null;

  const comparisonNarrative =
    hasCurrentComparison && recommendation.currentStack !== undefined
      ? buildComparisonNarrative(recommendation.currentStack, topStack)
      : null;
  const currentLabel =
    recommendation.currentStack !== undefined ? stackLabel(recommendation.currentStack) : "";
  const recommendedLabel = stackLabel(topStack);
  // The current card pins into "Outras escolhas" only when there's a real comparison to draw.
  const ladderCurrentStack =
    hasCurrentComparison && recommendation.currentStack !== undefined
      ? recommendation.currentStack
      : undefined;
  return (
    <main className="bg-surface text-ink-muted min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 md:py-12 lg:px-10">
        <BackLink className="mb-6" to="/input">
          Perfil
        </BackLink>
        <header className="max-w-4xl">
          <p className="text-caption text-ink-subtle">{recommendationEyebrow}</p>
          <h1 className="text-display-2 text-ink mt-2 leading-[1.05]">{stackLabel(topStack)}</h1>
          {isCurrentCardBest ? (
            <>
              <p className="text-ink-muted mt-4 text-base leading-relaxed">
                {profile.monthlyDomesticBrl > 0
                  ? `Já é o melhor cartão pro seu gasto de ${formatBrl(profile.monthlyDomesticBrl)}/mês.`
                  : "Já é o melhor cartão pro seu gasto."}
              </p>
              {currentCardUpside !== null ? (
                <p className="bg-line/35 mt-5 max-w-2xl rounded-sm px-4 py-3.5 text-sm leading-relaxed">
                  Você ganharia{" "}
                  <span className="text-accent tabular font-semibold">
                    +{formatAnnualBrl(currentCardUpside.deltaBrl)}
                  </span>
                  {currentCardUpside.gainPct > 0 ? (
                    <span className="text-ink-subtle"> (+{currentCardUpside.gainPct}%)</span>
                  ) : null}{" "}
                  com{" "}
                  <span className="text-ink font-semibold">
                    {currentCardUpside.requirementPhrase}
                  </span>{" "}
                  <span aria-hidden>→</span>{" "}
                  <StackLabelLink
                    stack={currentCardUpside.stack}
                    cardClassName="text-ink font-semibold"
                    separatorClassName="text-ink-subtle"
                  />
                </p>
              ) : null}
            </>
          ) : comparisonNarrative !== null ? (
            <p className="mt-4">
              <span className="text-display-3 text-accent tabular">
                +{formatBrl(comparisonNarrative.verdictBrl)}
              </span>
              <span className="text-ink-muted ml-1.5 text-base">/ano</span>
              <span className="text-ink-subtle ml-3 text-sm">vs. seu {currentLabel} atual</span>
            </p>
          ) : null}
          <HeroDetailLinks stack={topStack} />
          {heroRedemption !== null ? (
            <div className="mt-3 space-y-1" data-testid="travel-hero-teaser">
              <p className="text-ink-muted text-sm">
                Os pontos de um ano equivalem a{" "}
                {heroRedemption.trips === 1 ? (
                  "uma passagem"
                ) : (
                  <>{heroRedemption.trips} passagens</>
                )}{" "}
                {heroRedemption.roundTrip ? "ida e volta " : "só ida "}
                {heroRedemption.fromLabel} → {heroRedemption.toLabel}.
              </p>
              {heroRedemption.viaProgram !== undefined ? (
                <p className="text-ink-subtle text-xs">
                  Transferindo 1:1 para {formatPointsProgram(heroRedemption.viaProgram)}.
                </p>
              ) : null}
              <p className="text-ink-subtle text-xs">
                Pontos compatíveis: {formatPoints(heroRedemption.compatiblePoints)}
                {heroRedemption.remainingPoints > 0 ? (
                  <> · sobra {formatPoints(heroRedemption.remainingPoints)} pontos</>
                ) : null}
              </p>
            </div>
          ) : null}
        </header>

        {comparisonNarrative !== null ? (
          <CurrentVsRecommended
            narrative={comparisonNarrative}
            currentLabel={currentLabel}
            recommendedLabel={recommendedLabel}
            recommendedBenefits={recommendedBenefits ?? []}
            accessLabel={recommendedAccessLabel}
            {...(divergenceComparison !== null
              ? { preferenceComparison: divergenceComparison }
              : {})}
          />
        ) : (
          <section
            aria-label="Resumo da recomendação"
            className="border-line mt-8 grid grid-cols-1 gap-y-8 border-t border-b py-8 md:grid-cols-[1.45fr_1fr] md:gap-x-14 md:py-10"
          >
            <div>
              <p className="text-caption text-ink-subtle flex items-center gap-3">
                <span aria-hidden className="bg-line-strong h-px w-6" />
                Líquido estimado em 12 meses
              </p>
              <p className="text-kpi text-accent tabular mt-3">
                {formatBrl(topStack.yearOneNetValueBrl)}
              </p>
              {(() => {
                const optimisticNetBrl = transferBonusOptimisticNetBrl(topStack);
                return optimisticNetBrl !== null ? (
                  <p className="text-ink-subtle mt-1.5 text-xs leading-relaxed">
                    Com bônus de transferência de pontos, pode chegar a{" "}
                    <span className="tabular">{formatBrl(optimisticNetBrl)}</span>/ano.
                  </p>
                ) : null;
              })()}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {scoreLab?.verdict !== undefined && scoreLab.verdict.kind !== "viable" ? (
                  <Badge tone={VERDICT_TONE[scoreLab.verdict.kind]}>
                    {verdictLabel(scoreLab.verdict.kind)}
                  </Badge>
                ) : null}
                {recommendation.isReturnDecisionTight ? (
                  <Badge tone="warning">Decisão apertada</Badge>
                ) : null}
                <FeeTierBadge
                  annualFeeBrl={topStack.yearOneAnnualFeeBrl}
                  yearOneNetValueBrl={topStack.yearOneNetValueBrl}
                  waived={heroWaiverHint !== undefined}
                  {...(heroWaiverHint !== undefined ? { waiverHint: heroWaiverHint } : {})}
                />
              </div>
              {heroNotes.length > 0 ? (
                <div className="text-ink-muted mt-5 space-y-2 text-sm leading-relaxed">
                  {heroNotes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              ) : null}
            </div>

            <dl className="grid content-end gap-0 self-center text-sm">
              <Stat
                label="Anuidade total"
                value={formatBrl(topStack.yearOneAnnualFeeBrl)}
                labelClassName="text-ink-subtle"
                className="border-line border-b py-3"
              />
              {scoreLab ? (
                <Stat
                  label="Custo FX/IOF"
                  value={formatBrl(scoreLab.modeledAnnual.internationalCostBrl)}
                  labelClassName="text-ink-subtle"
                  className="border-line border-b py-3"
                />
              ) : null}
              {scoreLab !== undefined && scoreLab.modeledAnnual.benefitUtilityBrl > 0 ? (
                <div className="border-line border-b py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-subtle text-sm">Benefício de viagem</dt>
                    <dd className="text-num text-ink text-sm font-semibold">
                      {formatBrl(scoreLab.modeledAnnual.benefitUtilityBrl)}
                    </dd>
                  </div>
                  {benefitParts.length > 0 ? (
                    <p className="text-ink-subtle mt-1 text-xs leading-snug">
                      {benefitParts.join(" · ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </dl>
          </section>
        )}

        {comparisonNarrative === null && divergenceComparison !== null ? (
          <div className="border-line border-b py-8">
            <PreferencePanel comparison={divergenceComparison} />
          </div>
        ) : null}

        {comparisonNarrative !== null && heroNotes.length > 0 ? (
          <section
            aria-label="Avisos sobre a recomendação"
            className="border-line text-ink-muted space-y-2 border-b py-8 text-sm leading-relaxed"
          >
            {heroNotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </section>
        ) : null}

        {whyWonNarrative !== null && !hasCurrentComparison ? (
          <section className="border-line border-b" aria-label="Por que venceu">
            <article className="py-8">
              <h2 className="text-heading text-ink">Por que venceu</h2>
              <p className="text-ink-muted mt-6 space-y-1 text-sm leading-relaxed">
                {whyWonNarrative.map((sentence, i) => (
                  <span key={sentence} className={i > 0 ? "ml-1" : undefined}>
                    {sentence}
                  </span>
                ))}
              </p>
            </article>
          </section>
        ) : null}

        <AlternativesSection
          tabs={alternativeTabs}
          topStack={topStack}
          currentStack={ladderCurrentStack}
          anchoredOnCurrentCard={isCurrentCardBest}
          fullListHref={ROUTES.ALTERNATIVES}
        />

        <section className="mt-8" aria-label="Como chegamos ao líquido">
          <Disclosure summary="Como chegamos ao líquido">
            <CalculationBreakdown
              stack={topStack}
              profile={profile}
              ptaxRate={scoreLabMeta?.ptaxRate}
              ptaxAsOf={scoreLabMeta?.ptaxFetchedAt}
            />
          </Disclosure>
        </section>

        <footer className="border-line mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <Link to={ROUTES.INPUT} className="plain-link">
              Ajustar dados
            </Link>
            <Link to={ROUTES.CATALOG} className="plain-link">
              Explorar catálogo →
            </Link>
          </div>
          <a
            href={buildErrorReportUrl({
              stackLabel: stackLabel(topStack),
              scenarioId: scoreLabMeta?.scenarioId,
              scoreLabVersion: scoreLabMeta?.scoreLabVersion,
              ptaxRate: scoreLabMeta?.ptaxRate,
              ptaxSource: scoreLabMeta?.ptaxSource,
              ptaxFetchedAt: scoreLabMeta?.ptaxFetchedAt,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-subtle hover:text-accent focus-visible:ring-accent text-xs transition focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Encontrou um erro nos dados?{" "}
            <span className="underline underline-offset-4">Reportar no GitHub →</span>
          </a>
        </footer>
      </div>
    </main>
  );
};
