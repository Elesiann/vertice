import type { JSX } from "react";
import { Link } from "react-router-dom";
import { TravelTranslation } from "@/components/domain/TravelTranslation";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Disclosure } from "@/components/ui/Disclosure";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { useSession } from "@/context/SessionContext";
import { useRecommendation } from "@/hooks/useRecommendation";
import { buildErrorReportUrl } from "@/lib/feedback";
import { formatBrl, formatUsd } from "@/lib/format";
import { whyWonSentences } from "@/lib/why-won";
import { ROUTES } from "@/routes";
import type {
  LeaderboardAxisId,
  ProgramId,
  Recommendation,
  RedemptionPreference,
  SpendingProfile,
  StackEvaluation,
} from "@/types";

const AXIS_LABEL: Record<LeaderboardAxisId, string> = {
  "net-return": "Retorno",
  liquidity: "Liquidez",
  "annual-fee": "Anuidade",
  simplicity: "Simplicidade",
  accessibility: "Acessibilidade",
};

const LIQUIDITY_LABEL: Record<"high" | "medium" | "low", string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const ALTERNATIVE_THRESHOLD_FLOOR_BRL = 1_500;

const PROGRAM_LABEL: Partial<Record<ProgramId, string>> = {
  cashback: "cashback",
  smiles: "Smiles",
  "latam-pass": "LATAM Pass",
  tudoazul: "TudoAzul",
  livelo: "Livelo",
  esfera: "Esfera",
  "inter-loop": "Inter Loop",
  "uau-caixa": "Uau Caixa",
  atomos: "Átomos",
  "btg-points": "BTG Points",
  aadvantage: "AAdvantage",
  "tap-miles-and-go": "TAP Miles&Go",
  "pao-de-acucar-mais": "Pão de Açúcar Mais",
  "cresol-pontos": "Cresol Pontos",
  coopera: "Coopera",
  "sisprime-pontos": "Sisprime Pontos",
  "unicred-unico": "Unicred Único",
  "safra-rewards": "Safra Rewards",
  "porto-plus": "PortoPlus",
  "nomad-pass": "Nomad Pass",
  revpoints: "RevPoints",
  "iberia-club": "Iberia Club",
  "ba-club": "British Airways Club",
  "qatar-privilege-club": "Qatar Privilege Club",
  "turkish-miles-smiles": "Turkish Miles&Smiles",
  "finnair-plus": "Finnair Plus",
  "aer-lingus-aerclub": "Aer Lingus AerClub",
  "vueling-club": "Vueling Club",
  "flying-blue": "Flying Blue",
  "etihad-guest": "Etihad Guest",
};

const MILES_PROGRAMS = new Set<ProgramId>([
  "smiles",
  "latam-pass",
  "tudoazul",
  "aadvantage",
  "tap-miles-and-go",
  "nomad-pass",
  "iberia-club",
  "ba-club",
  "qatar-privilege-club",
  "turkish-miles-smiles",
  "finnair-plus",
  "aer-lingus-aerclub",
  "vueling-club",
  "flying-blue",
  "etihad-guest",
]);

interface CuratedAlternative {
  slot: "no-barrier" | "conditional-upside" | "institutional" | "net-return" | "axis";
  label: string;
  stack: StackEvaluation;
  detail: string;
}

const cardsInUse = (stack: StackEvaluation): StackEvaluation["cards"] => {
  const activeCards = stack.cards.filter((card) => {
    const alloc = stack.allocation.find((item) => item.cardId === card.id);
    return (
      alloc !== undefined && (alloc.monthlyDomesticBrl > 0 || alloc.monthlyInternationalUsd > 0)
    );
  });
  return activeCards.length > 0 ? activeCards : stack.cards;
};

const stackId = (stack: StackEvaluation): string =>
  cardsInUse(stack)
    .map((card) => card.id)
    .slice()
    .sort()
    .join("|");

const stackLabel = (stack: StackEvaluation): string =>
  cardsInUse(stack)
    .map((card) => card.name)
    .join(" + ");

const primaryProgram = (stack: StackEvaluation): ProgramId | undefined =>
  cardsInUse(stack)[0]?.pointsProgram ?? stack.cards[0]?.pointsProgram;

const titleCaseProgram = (program: ProgramId): string =>
  program
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const programRedemptionLabel = (program: ProgramId | undefined): string => {
  if (program === undefined) return "outro programa";
  if (program === "cashback") return "cashback";
  const brand = PROGRAM_LABEL[program] ?? titleCaseProgram(program);
  return `${MILES_PROGRAMS.has(program) ? "milhas" : "pontos"} ${brand}`;
};

const preferenceLabel = (redemption: RedemptionPreference): string => {
  if (redemption.kind === "cashback") return "cashback";
  if (redemption.kind === "miles") return programRedemptionLabel(redemption.program);
  return "sem preferência";
};

const stackMatchesPreference = (
  stack: StackEvaluation,
  redemption: RedemptionPreference,
): boolean => {
  if (redemption.kind === "any") return true;
  const program = primaryProgram(stack);
  if (redemption.kind === "cashback") return program === "cashback";
  return program === redemption.program;
};

const stackFinancialRequirement = (
  stack: StackEvaluation,
): {
  minInvestmentBrl: number;
  minInvestmentUsd: number;
  investmentFeeWaiverBrl: number;
  aggregateBrl: number;
  requiredInvestmentUsd: number;
} =>
  cardsInUse(stack).reduce(
    (highest, card) => {
      const minInvestmentBrl = card.minInvestmentBrl ?? 0;
      const minInvestmentUsd = card.minInvestmentUsd ?? 0;
      const investmentFeeWaiverBrl = card.investmentFeeWaiverBrl ?? 0;
      const aggregateBrl =
        card.requiredInvestmentBrl ?? Math.max(minInvestmentBrl, investmentFeeWaiverBrl);
      const requiredInvestmentUsd = card.requiredInvestmentUsd ?? minInvestmentUsd;
      return {
        minInvestmentBrl: Math.max(highest.minInvestmentBrl, minInvestmentBrl),
        minInvestmentUsd: Math.max(highest.minInvestmentUsd, minInvestmentUsd),
        investmentFeeWaiverBrl: Math.max(highest.investmentFeeWaiverBrl, investmentFeeWaiverBrl),
        aggregateBrl: Math.max(highest.aggregateBrl, aggregateBrl),
        requiredInvestmentUsd: Math.max(highest.requiredInvestmentUsd, requiredInvestmentUsd),
      };
    },
    {
      minInvestmentBrl: 0,
      minInvestmentUsd: 0,
      investmentFeeWaiverBrl: 0,
      aggregateBrl: 0,
      requiredInvestmentUsd: 0,
    },
  );

const stackInvestmentRequirementLabel = (stack: StackEvaluation): string => {
  const requirement = stackFinancialRequirement(stack);
  const parts: string[] = [];
  if (requirement.minInvestmentBrl > 0) {
    parts.push(`acesso ${formatBrl(requirement.minInvestmentBrl)}`);
  }
  if (requirement.minInvestmentUsd > 0) {
    parts.push(`acesso ${formatUsd(requirement.minInvestmentUsd)}`);
  }
  if (requirement.investmentFeeWaiverBrl > 0) {
    parts.push(`isenção ${formatBrl(requirement.investmentFeeWaiverBrl)}`);
  }
  if (parts.length === 0 && requirement.aggregateBrl > 0) {
    return `Até ${formatBrl(requirement.aggregateBrl)}`;
  }
  return parts.length > 0 ? parts.join(" · ") : "Sem exigência";
};

const stackAccessibilitySummary = (profile: SpendingProfile, stack: StackEvaluation): string => {
  const requirement = stackFinancialRequirement(stack);
  const requiredInvestmentBrl = requirement.aggregateBrl;
  if (requiredInvestmentBrl <= 0 && requirement.requiredInvestmentUsd <= 0) {
    return "Sem exigência financeira adicional neste cartão.";
  }

  if (requiredInvestmentBrl <= 0 && requirement.requiredInvestmentUsd > 0) {
    return `Este cartão exige investimento de acesso em dólar: ${formatUsd(requirement.requiredInvestmentUsd)}.`;
  }

  if (profile.availableToInvestBrl === undefined) {
    return `Para a melhor acessibilidade, considere ${formatBrl(requiredInvestmentBrl)} disponíveis para investir.`;
  }

  if (profile.availableToInvestBrl >= requiredInvestmentBrl) {
    return `Seu valor disponível (${formatBrl(profile.availableToInvestBrl)}) cobre a exigência de investimento (${formatBrl(requiredInvestmentBrl)}).`;
  }

  return `A exigência estimada (${formatBrl(requiredInvestmentBrl)}) supera os ${formatBrl(profile.availableToInvestBrl)} informados. O cartão segue comparado sem bloqueio automático.`;
};

const VERDICT_TONE: Record<"strong" | "viable" | "negative", "accent" | "neutral" | "warning"> = {
  strong: "accent",
  viable: "neutral",
  negative: "warning",
};

const formatRoiMultiple = (value: number): string => `${value.toFixed(2).replace(".", ",")}x`;

const formatAnnualBrl = (value: number): string => `${formatBrl(value)}/ano`;

const verdictLabel = (
  kind: NonNullable<StackEvaluation["scoreLab"]>["verdict"]["kind"],
): string => {
  if (kind === "strong") return "Retorno alto";
  if (kind === "viable") return "Retorno positivo";
  return "Retorno negativo";
};

const comparisonThreshold = (topStack: StackEvaluation): number =>
  Math.max(ALTERNATIVE_THRESHOLD_FLOOR_BRL, topStack.yearOneNetValueBrl * 0.25);

const compareCandidate = (a: StackEvaluation, b: StackEvaluation): number => {
  if (a.yearOneNetValueBrl !== b.yearOneNetValueBrl) {
    return b.yearOneNetValueBrl - a.yearOneNetValueBrl;
  }
  const scoreA = a.scoreLab?.score ?? 0;
  const scoreB = b.scoreLab?.score ?? 0;
  if (scoreA !== scoreB) return scoreB - scoreA;
  return stackId(a).localeCompare(stackId(b));
};

const uniqueCandidatePool = (recommendation: Recommendation): StackEvaluation[] => {
  const seen = new Set<string>([stackId(recommendation.topStack)]);
  const decisionTracks = recommendation.scoreLab?.decisionTracks;
  const candidates = [
    ...recommendation.alternatives,
    ...recommendation.leaderboardsByAxis.flatMap((axis) => axis.stacks),
    decisionTracks?.recommendedNow,
    decisionTracks?.actionable,
    decisionTracks?.nearUnlock,
    decisionTracks?.stretch,
    decisionTracks?.conditionalUpside,
    decisionTracks?.closestActionableSubstitute?.stack,
    recommendation.scoreLab?.netReturnLeader,
    recommendation.scoreLab?.institutionalAlternative?.stack,
  ].filter((stack): stack is StackEvaluation => stack !== undefined && stack !== null);

  return candidates.filter((stack) => {
    const id = stackId(stack);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const hasNoInvestmentBarrier = (stack: StackEvaluation): boolean =>
  cardsInUse(stack).every(
    (card) =>
      (card.minInvestmentBrl ?? 0) <= 0 &&
      (card.minInvestmentUsd ?? 0) <= 0 &&
      (card.requiredInvestmentBrl ?? 0) <= 0 &&
      (card.requiredInvestmentUsd ?? 0) <= 0,
  );

const withinThreshold = (
  topStack: StackEvaluation,
  candidate: StackEvaluation | undefined,
  threshold: number,
): candidate is StackEvaluation =>
  candidate !== undefined &&
  topStack.yearOneNetValueBrl - candidate.yearOneNetValueBrl <= threshold;

const returnGapSentence = (topStack: StackEvaluation, stack: StackEvaluation): string => {
  const delta = stack.yearOneNetValueBrl - topStack.yearOneNetValueBrl;
  if (Math.abs(delta) < 0.01) return "Mesmo retorno líquido anual do recomendado.";
  if (delta > 0) return `${formatAnnualBrl(delta)} acima do recomendado.`;
  return `${formatAnnualBrl(Math.abs(delta))} abaixo do recomendado.`;
};

const buildCuratedAlternatives = (recommendation: Recommendation): CuratedAlternative[] => {
  const topStack = recommendation.topStack;
  const threshold = comparisonThreshold(topStack);
  const pool = uniqueCandidatePool(recommendation);
  const picked = new Set<string>();

  const take = (stack: StackEvaluation | undefined): StackEvaluation | undefined => {
    if (!withinThreshold(topStack, stack, threshold)) return undefined;
    const id = stackId(stack);
    if (id === stackId(topStack)) return undefined;
    if (picked.has(id)) return undefined;
    picked.add(id);
    return stack;
  };

  const slots: CuratedAlternative[] = [];
  const noBarrier = take(pool.filter(hasNoInvestmentBarrier).sort(compareCandidate)[0]);
  if (noBarrier !== undefined) {
    slots.push({
      slot: "no-barrier",
      label: "Sem barreira",
      stack: noBarrier,
      detail: `Sem investimento mínimo de acesso. ${returnGapSentence(topStack, noBarrier)}`,
    });
  }

  const conditionalUpside = take(recommendation.scoreLab?.decisionTracks?.conditionalUpside);
  if (conditionalUpside !== undefined) {
    slots.push({
      slot: "conditional-upside",
      label: "Retorno condicionado",
      stack: conditionalUpside,
      detail: `Maior retorno modelado, mas depende de requisito de acesso. ${returnGapSentence(topStack, conditionalUpside)}`,
    });
  }

  const topReliability = topStack.scoreLab?.productReliabilityScore ?? 100;
  const institutional =
    recommendation.scoreLab?.institutionalAlternative?.stack ??
    (topReliability < 85
      ? pool
          .filter((stack) => (stack.scoreLab?.productReliabilityScore ?? 0) >= 90)
          .sort(compareCandidate)[0]
      : undefined);
  const institutionalChoice = take(institutional);
  if (institutionalChoice !== undefined) {
    slots.push({
      slot: "institutional",
      label: "Institucional",
      stack: institutionalChoice,
      detail: `Opção institucional próxima. ${returnGapSentence(topStack, institutionalChoice)}`,
    });
  }

  const netLeader =
    recommendation.scoreLab?.netReturnLeader ?? pool.slice().sort(compareCandidate)[0];
  const netReturn = take(netLeader);
  if (netReturn !== undefined) {
    slots.push({
      slot: "net-return",
      label: "Maior retorno",
      stack: netReturn,
      detail: `Maior retorno líquido no catálogo. ${returnGapSentence(topStack, netReturn)}`,
    });
  }

  const axisLeader = recommendation.leaderboardsByAxis
    .filter((axis) => axis.axisId !== "net-return")
    .map((axis) => ({ axisId: axis.axisId, stack: axis.stacks[0] }))
    .filter((item): item is { axisId: LeaderboardAxisId; stack: StackEvaluation } => {
      if (!withinThreshold(topStack, item.stack, threshold)) return false;
      const id = stackId(item.stack);
      return id !== stackId(topStack) && !picked.has(id);
    })
    .sort((a, b) => compareCandidate(a.stack, b.stack))[0];
  const axisChoice = take(axisLeader?.stack);
  if (axisChoice !== undefined && axisLeader !== undefined) {
    slots.push({
      slot: "axis",
      label: AXIS_LABEL[axisLeader.axisId],
      stack: axisChoice,
      detail: `Lidera ${AXIS_LABEL[axisLeader.axisId].toLowerCase()} neste perfil. ${returnGapSentence(topStack, axisChoice)}`,
    });
  }

  return slots;
};

const alternativesHeroSentence = (
  alternatives: CuratedAlternative[],
  threshold: number,
): string => {
  const alternative = alternatives[0];
  if (alternative === undefined) {
    return `Nenhuma combinação do catálogo chega a ${formatAnnualBrl(threshold)} de diferença.`;
  }
  return `Outra escolha próxima: ${alternative.label.toLowerCase()}, ${stackLabel(alternative.stack)} entrega ${formatAnnualBrl(alternative.stack.yearOneNetValueBrl)}.`;
};

const preferenceDivergenceNotice = (
  profile: SpendingProfile,
  recommendation: Recommendation,
  threshold: number,
): string | null => {
  if (profile.redemption.kind === "any") return null;

  const topProgram = primaryProgram(recommendation.topStack);
  if (stackMatchesPreference(recommendation.topStack, profile.redemption)) return null;

  const preferred = preferenceLabel(profile.redemption);
  const topRedemption = programRedemptionLabel(topProgram);
  const bestOfPreference = recommendation.alternatives
    .filter((stack) => stackMatchesPreference(stack, profile.redemption))
    .sort(compareCandidate)[0];

  if (bestOfPreference !== undefined) {
    return `Você marcou ${preferred}. O recomendado é ${topRedemption}: ${formatAnnualBrl(recommendation.topStack.yearOneNetValueBrl)} contra ${formatAnnualBrl(bestOfPreference.yearOneNetValueBrl)} do melhor de ${preferred}.`;
  }

  return `Você marcou ${preferred}. O recomendado é ${topRedemption}: nenhum cartão de ${preferred} chega a ${formatAnnualBrl(threshold)} do retorno dele.`;
};

const displayStackFor = (recommendation: Recommendation): StackEvaluation =>
  recommendation.scoreLab?.decisionTracks?.recommendedNow ?? recommendation.topStack;

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
  const topStack = displayStackFor(recommendation);
  const displayRecommendation = recommendationWithTopStack(recommendation, topStack);
  const scoreLab = topStack.scoreLab;
  const whyWonNarrative = whyWonSentences(topStack, recommendation.alternatives);
  const accessibilitySummary = stackAccessibilitySummary(profile, topStack);
  const threshold = comparisonThreshold(topStack);
  const curatedAlternatives = buildCuratedAlternatives(displayRecommendation);
  const divergenceNotice = preferenceDivergenceNotice(profile, displayRecommendation, threshold);
  const conditionalUpside = decisionTracks?.conditionalUpside;
  const conditionalUpsideNotice =
    conditionalUpside !== undefined && stackId(conditionalUpside) !== stackId(topStack)
      ? `Maior retorno modelado: ${stackLabel(conditionalUpside)} entrega ${formatAnnualBrl(conditionalUpside.yearOneNetValueBrl)}, mas depende de requisito de acesso.`
      : null;
  const noRecommendationReason =
    decisionTracks?.recommendedNow === null ? decisionTracks.noRecommendationReason : undefined;
  const recommendationEyebrow =
    noRecommendationReason !== undefined ? "Melhor acionável encontrado" : "Stack recomendado";
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
          benefitBreakdown.loungeValueBrl > 0
            ? `sala VIP ${formatBrl(benefitBreakdown.loungeValueBrl)}`
            : null,
          benefitBreakdown.insuranceValueBrl > 0
            ? `seguro ${formatBrl(benefitBreakdown.insuranceValueBrl)}`
            : null,
          benefitBreakdown.baggageValueBrl > 0
            ? `bagagem ${formatBrl(benefitBreakdown.baggageValueBrl)}`
            : null,
        ].filter((part): part is string => part !== null)
      : [];
  const heroNotes = [
    noRecommendationNotice,
    conditionalUpsideNotice,
    divergenceNotice,
    curatedAlternatives.length < 2
      ? alternativesHeroSentence(curatedAlternatives, threshold)
      : null,
  ].filter((note): note is string => note !== null);
  const travelTranslationMatchesTopStack = stackId(topStack) === stackId(recommendation.topStack);
  const displayMoneyOnTheTableBrl =
    recommendation.currentStack !== undefined
      ? Math.max(0, topStack.yearOneNetValueBrl - recommendation.currentStack.yearOneNetValueBrl)
      : recommendation.moneyOnTheTableBrl;

  const hasCurrentComparison =
    (profile.currentCardIds?.length ?? 0) > 0 &&
    recommendation.currentStack !== undefined &&
    displayMoneyOnTheTableBrl !== undefined &&
    displayMoneyOnTheTableBrl > 0;

  return (
    <main className="bg-surface text-ink-muted min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 md:py-12 lg:px-10">
        <header className="max-w-4xl">
          <p className="text-caption text-ink-subtle">{recommendationEyebrow}</p>
          <h1 className="text-display-2 text-ink mt-2 leading-[1.05]">{stackLabel(topStack)}</h1>
        </header>

        <section
          aria-label="Resumo da recomendação"
          className="border-line mt-8 grid grid-cols-1 gap-y-8 border-t border-b py-8 md:grid-cols-[1.45fr_1fr] md:gap-x-14 md:py-10"
        >
          <div>
            {hasCurrentComparison ? (
              <>
                <p className="text-caption text-ink-subtle flex items-center gap-3">
                  <span aria-hidden className="bg-line-strong h-px w-6" />
                  Você está deixando na mesa
                </p>
                <p className="text-kpi text-danger tabular mt-3">
                  {formatBrl(displayMoneyOnTheTableBrl)}
                </p>
                <p className="text-ink-muted mt-4 max-w-xl text-sm leading-relaxed">
                  por ano com seu cartão atual. O recomendado entrega{" "}
                  <span className="text-num text-ink font-semibold">
                    {formatBrl(topStack.yearOneNetValueBrl)}
                  </span>{" "}
                  líquido em 12 meses.
                </p>
              </>
            ) : (
              <>
                <p className="text-caption text-ink-subtle flex items-center gap-3">
                  <span aria-hidden className="bg-line-strong h-px w-6" />
                  Líquido estimado em 12 meses
                </p>
                <p className="text-kpi text-accent tabular mt-3">
                  {formatBrl(topStack.yearOneNetValueBrl)}
                </p>
              </>
            )}
            {scoreLab?.verdict !== undefined || recommendation.isReturnDecisionTight ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {scoreLab?.verdict !== undefined ? (
                  <Badge tone={VERDICT_TONE[scoreLab.verdict.kind]}>
                    {verdictLabel(scoreLab.verdict.kind)}
                  </Badge>
                ) : null}
                {recommendation.isReturnDecisionTight ? (
                  <Badge tone="warning">Decisão apertada</Badge>
                ) : null}
              </div>
            ) : null}
            {heroNotes.length > 0 ? (
              <div className="text-ink-muted mt-5 space-y-2 text-sm leading-relaxed">
                {heroNotes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            ) : null}
          </div>

          <dl className="grid content-end gap-0 self-end text-sm">
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

        {curatedAlternatives.length >= 2 ? (
          <section className="border-line border-b py-8" aria-label="Outras escolhas">
            <h2 className="text-heading text-ink">Outras escolhas</h2>
            <ol className="divide-line mt-5 divide-y text-sm">
              {curatedAlternatives.map((alternative) => (
                <li
                  key={`${alternative.slot}-${stackId(alternative.stack)}`}
                  className="grid gap-2 py-4 sm:grid-cols-[136px_1fr_auto] sm:items-baseline sm:gap-5"
                >
                  <span className="text-caption text-ink-subtle">{alternative.label}</span>
                  <span>
                    <span className="text-ink block font-semibold">
                      {stackLabel(alternative.stack)}
                    </span>
                    <span className="text-ink-subtle mt-1 block text-xs leading-relaxed">
                      {alternative.detail}
                    </span>
                  </span>
                  <span className="text-num text-ink font-semibold">
                    {formatAnnualBrl(alternative.stack.yearOneNetValueBrl)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {whyWonNarrative !== null ? (
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
              <p className="border-line text-ink-muted mt-6 border-t pt-5 text-sm leading-relaxed">
                <span className="text-caption text-ink-subtle mb-1 block">Acesso</span>
                {accessibilitySummary}
              </p>
            </article>
          </section>
        ) : null}

        <section className="mt-8" aria-label="Cálculo completo">
          <Disclosure summary="Ver cálculo completo">
            <div className="border-line/50 space-y-8 border-t px-4 py-6 sm:px-6">
              {scoreLab ? (
                <div>
                  <h3 className="text-subheading text-ink">Score-lab</h3>
                  <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                    Cálculo determinístico com câmbio do dia{" "}
                    <span className="text-num text-ink font-semibold">
                      {scoreLabMeta ? formatBrl(scoreLabMeta.ptaxRate) : "atual"}
                    </span>{" "}
                    por US$ 1.
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
                    {scoreLab.breakEvenMonthlySpendBrl !== null ? (
                      <Stat
                        block
                        label="Stack se paga a partir de"
                        value={`${formatBrl(scoreLab.breakEvenMonthlySpendBrl)}/mês`}
                        labelClassName="text-ink-subtle"
                      />
                    ) : null}
                    {scoreLab.roiMultiple !== null ? (
                      <Stat
                        block
                        label="Retorno por real de anuidade"
                        value={formatRoiMultiple(scoreLab.roiMultiple)}
                        labelClassName="text-ink-subtle"
                      />
                    ) : null}
                    <Stat
                      block
                      label="Retorno bruto"
                      value={formatBrl(scoreLab.modeledAnnual.grossValueBrl)}
                      labelClassName="text-ink-subtle"
                    />
                    <Stat
                      block
                      label="Liquidez"
                      value={LIQUIDITY_LABEL[topStack.liquidity]}
                      labelClassName="text-ink-subtle"
                    />
                    <Stat
                      block
                      label="Condição financeira"
                      value={stackInvestmentRequirementLabel(topStack)}
                      labelClassName="text-ink-subtle"
                    />
                  </dl>
                </div>
              ) : null}

              {scoreLabMeta?.netReturnLeaderDiffers ? (
                <p className="border-line-strong text-ink-muted border-l-2 py-1 pl-3 text-sm leading-relaxed">
                  Maior retorno líquido isolado:{" "}
                  <span className="text-ink font-semibold">
                    {stackLabel(scoreLabMeta.netReturnLeader)}
                  </span>{" "}
                  ({formatBrl(scoreLabMeta.netReturnLeader.yearOneNetValueBrl)}). O recomendado
                  pondera retorno, condições de acesso, custo, objetivo e distribuição do gasto.
                </p>
              ) : null}

              {scoreLabMeta?.institutionalAlternative ? (
                <p className="border-line-strong text-ink-muted border-l-2 py-1 pl-3 text-sm leading-relaxed">
                  Alternativa institucional próxima:{" "}
                  <span className="text-ink font-semibold">
                    {stackLabel(scoreLabMeta.institutionalAlternative.stack)}
                  </span>
                  . Entrega{" "}
                  {formatAnnualBrl(scoreLabMeta.institutionalAlternative.stack.yearOneNetValueBrl)}.{" "}
                  {returnGapSentence(topStack, scoreLabMeta.institutionalAlternative.stack)}
                </p>
              ) : null}
            </div>
          </Disclosure>
        </section>

        {travelTranslationMatchesTopStack ? (
          <div className="mt-8">
            <TravelTranslation translation={recommendation.travelTranslation} />
          </div>
        ) : null}

        <footer className="border-line mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <Link to={ROUTES.INPUT} className="plain-link">
            Ajustar dados
          </Link>
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
