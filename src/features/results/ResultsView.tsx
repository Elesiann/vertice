import { Fragment, useState, type JSX } from "react";
import { Link } from "react-router-dom";
import { FeeTierBadge } from "@/components/domain/FeeTierBadge";
import { TravelTranslation } from "@/components/domain/TravelTranslation";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Disclosure } from "@/components/ui/Disclosure";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { useSession } from "@/context/SessionContext";
import { useRecommendation } from "@/hooks/useRecommendation";
import { cn } from "@/lib/cn";
import { buildErrorReportUrl } from "@/lib/feedback";
import { formatBrl, formatRoiMultiple, formatUsd } from "@/lib/format";
import { whyWonSentences } from "@/lib/why-won";
import { CurrentVsRecommended } from "@/features/results/CurrentVsRecommended";
import { buildComparisonNarrative } from "@/lib/comparison-narrative";
import { ROUTES } from "@/routes";
import type {
  Bank,
  ProgramId,
  PublicStackCard,
  Recommendation,
  RedemptionPreference,
  SpendingProfile,
  StackEvaluation,
} from "@/types";

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

type AlternativeTabId =
  | "lowest-barrier"
  | "traditional"
  | "fintech"
  | "highest-return"
  | "most-similar";

interface AlternativeTab {
  id: AlternativeTabId;
  label: string;
  stacks: StackEvaluation[];
}

// "Tradicional" = cartão DO banco incumbente, sob a marca dele. Cobranded
// (Amazon Mastercard, Latam Pass, Azul Itaucard) tem `bank: bradesco|itau`
// no catálogo mas o usuário não os enxerga como "tradicional" — são produtos
// de marca terceira. Filtramos exigindo que o nome contenha um alias do
// banco. "Fintech" recebe o resto (incluindo cobranded).
const TRADITIONAL_BANKS = new Set<Bank>(["itau", "bradesco", "santander", "bb"]);

const TRADITIONAL_BANK_ALIASES: Record<string, readonly string[]> = {
  itau: ["itau", "itaú", "itaucard", "personnalité", "personnalite"],
  bradesco: ["bradesco"],
  santander: ["santander"],
  bb: ["banco do brasil", "ourocard"],
};

const cardIsTraditional = (card: PublicStackCard): boolean => {
  if (!TRADITIONAL_BANKS.has(card.bank)) return false;
  const aliases = TRADITIONAL_BANK_ALIASES[card.bank] ?? [];
  const haystack = card.name.toLowerCase();
  return aliases.some((alias) => haystack.includes(alias));
};

const ALTERNATIVES_PER_TAB = 5;

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

  // 1. Barreira real para CONTRATAR (acesso). minInvestmentBrl + relacionamento
  //    de investimento são sempre relevantes, independente da anuidade.
  if (requirement.minInvestmentBrl > 0) {
    const value = formatBrl(requirement.minInvestmentBrl);
    const base = `Acesso exige ${value} em investimentos no banco emissor.`;
    if (profile.availableToInvestBrl === undefined) return base;
    if (profile.availableToInvestBrl >= requirement.minInvestmentBrl) {
      return `${base} Os ${formatBrl(profile.availableToInvestBrl)} informados cobrem.`;
    }
    return `${base} Faltam ${formatBrl(requirement.minInvestmentBrl - profile.availableToInvestBrl)} aos ${formatBrl(profile.availableToInvestBrl)} informados. O cartão segue comparado sem bloqueio automático.`;
  }

  if (requirement.requiredInvestmentUsd > 0) {
    return `Acesso exige ${formatUsd(requirement.requiredInvestmentUsd)} em investimentos no banco emissor.`;
  }

  // 2. Apenas threshold de isenção de anuidade. Só faz sentido mencionar se
  //    a anuidade NÃO está zerada no cenário modelado — caso contrário o
  //    waiver já foi acionado por outra rota (gasto, etc.) e a frase soa
  //    como se fosse sobre outro cartão.
  if (requirement.investmentFeeWaiverBrl > 0 && stack.yearOneAnnualFeeBrl > 0) {
    const value = formatBrl(requirement.investmentFeeWaiverBrl);
    const base = `Anuidade isenta com ${value} em investimentos no banco emissor.`;
    if (profile.availableToInvestBrl === undefined) {
      return `${base} No seu cenário, a anuidade modelada é ${formatBrl(stack.yearOneAnnualFeeBrl)}.`;
    }
    if (profile.availableToInvestBrl >= requirement.investmentFeeWaiverBrl) {
      return `${base} Os ${formatBrl(profile.availableToInvestBrl)} informados cobrem.`;
    }
    return `${base} No seu cenário, a anuidade modelada é ${formatBrl(stack.yearOneAnnualFeeBrl)}.`;
  }

  return "Sem exigência financeira de acesso.";
};

const VERDICT_TONE: Record<"strong" | "viable" | "negative", "accent" | "neutral" | "warning"> = {
  strong: "accent",
  viable: "neutral",
  negative: "warning",
};

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

const stackIsTraditional = (stack: StackEvaluation): boolean => {
  const cards = cardsInUse(stack);
  return cards.length > 0 && cards.every(cardIsTraditional);
};

const stackIsFintech = (stack: StackEvaluation): boolean => {
  const cards = cardsInUse(stack);
  return cards.length > 0 && cards.every((card) => !cardIsTraditional(card));
};

const stackAccessBarrierBrl = (stack: StackEvaluation): number =>
  cardsInUse(stack).reduce((max, card) => {
    const min = card.minInvestmentBrl ?? 0;
    const investmentRelationship =
      card.requiresRelationship === "investment" || card.requiresRelationship === "private";
    const required = investmentRelationship ? (card.requiredInvestmentBrl ?? 0) : 0;
    return Math.max(max, min, required);
  }, 0);

const stackAccessBarrierLabel = (stack: StackEvaluation): string | null => {
  for (const card of cardsInUse(stack)) {
    if ((card.minInvestmentBrl ?? 0) > 0) {
      return `exige ${formatBrl(card.minInvestmentBrl ?? 0)} investidos no emissor`;
    }
    const investmentRelationship =
      card.requiresRelationship === "investment" || card.requiresRelationship === "private";
    if (investmentRelationship && (card.requiredInvestmentBrl ?? 0) > 0) {
      return `exige ${formatBrl(card.requiredInvestmentBrl ?? 0)} investidos no emissor`;
    }
    if (card.requiresRelationship === "private") {
      return "exige private banking";
    }
  }
  return null;
};

const TAB_DESCRIPTIONS: Record<AlternativeTabId, string> = {
  "lowest-barrier": "Cartões com a mesma exigência de acesso do recomendado, ou menor.",
  traditional:
    "Cartões emitidos por Itaú, Bradesco, Santander ou Banco do Brasil sob a marca do banco.",
  fintech: "Bancos digitais, fintechs e produtos cobranded.",
  "highest-return": "Maior retorno líquido modelado — mesmo com barreiras adicionais.",
  "most-similar": "Cartões com o perfil de uso mais parecido com o recomendado.",
};

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

// Closest-by-score card = 100%; roughly one extra score-point of distance costs one
// percentage point; clamped to [0, 100]. The raw score itself is never displayed.
const mostSimilarCompat = (
  stacks: StackEvaluation[],
  topStack: StackEvaluation,
): Map<string, number> => {
  const topScore = topStack.scoreLab?.score ?? 0;
  const dist = (s: StackEvaluation): number => Math.abs((s.scoreLab?.score ?? 0) - topScore);
  const minDist = stacks.length > 0 ? Math.min(...stacks.map(dist)) : 0;
  return new Map(
    stacks.map((s) => [stackId(s), Math.max(0, Math.round(100 - (dist(s) - minDist)))]),
  );
};

const buildAlternativeTabs = (recommendation: Recommendation): AlternativeTab[] => {
  const topStack = recommendation.topStack;
  const threshold = comparisonThreshold(topStack);
  const pool = uniqueCandidatePool(recommendation);

  const eligible = pool.filter((stack) => withinThreshold(topStack, stack, threshold));

  const dedupe = (stacks: StackEvaluation[]): StackEvaluation[] => {
    const seen = new Set<string>();
    const result: StackEvaluation[] = [];
    for (const stack of stacks) {
      const id = stackId(stack);
      if (seen.has(id)) continue;
      seen.add(id);
      result.push(stack);
    }
    return result;
  };

  const take = (stacks: StackEvaluation[]): StackEvaluation[] =>
    dedupe(stacks).sort(compareCandidate).slice(0, ALTERNATIVES_PER_TAB);

  const recBarrier = stackAccessBarrierBrl(topStack);
  const lowerBarrier = (stack: StackEvaluation): boolean =>
    recBarrier === 0 ? hasNoInvestmentBarrier(stack) : stackAccessBarrierBrl(stack) <= recBarrier;

  // "Mais semelhantes" ranks the full pool by score proximity — deliberately NOT threshold-gated
  // like the other tabs (it's a usage-fit lens, not a return lens). Cards without a score drop out.
  // Not hoisting decisionTracks.closestActionableSubstitute: it would break the "#1 = closest = 100%" framing.
  const topScore = topStack.scoreLab?.score;
  const mostSimilarStacks =
    topScore === undefined
      ? []
      : pool
          .filter((s) => s.scoreLab !== undefined)
          .sort((a, b) => {
            const da = Math.abs((a.scoreLab?.score ?? 0) - topScore);
            const db = Math.abs((b.scoreLab?.score ?? 0) - topScore);
            if (da !== db) return da - db;
            return stackId(a).localeCompare(stackId(b));
          })
          .slice(0, ALTERNATIVES_PER_TAB);

  const tabs: AlternativeTab[] = [
    {
      id: "lowest-barrier",
      label: "Menor barreira",
      stacks: take(eligible.filter(lowerBarrier)),
    },
    {
      id: "most-similar",
      label: "Mais semelhantes",
      stacks: mostSimilarStacks,
    },
    {
      id: "traditional",
      label: "Tradicional",
      stacks: take(eligible.filter(stackIsTraditional)),
    },
    {
      id: "fintech",
      label: "Fintech",
      stacks: take(eligible.filter(stackIsFintech)),
    },
    {
      id: "highest-return",
      label: "Maior retorno",
      stacks: take(eligible),
    },
  ];

  return tabs.filter((tab) => tab.stacks.length > 0);
};

type DeltaTone = "above" | "even" | "below";

const stackDelta = (
  topStack: StackEvaluation,
  stack: StackEvaluation,
): { tone: DeltaTone; label: string } => {
  const delta = stack.yearOneNetValueBrl - topStack.yearOneNetValueBrl;
  if (Math.abs(delta) < 0.01) return { tone: "even", label: "mesmo retorno" };
  if (delta > 0) return { tone: "above", label: `${formatBrl(delta)} acima` };
  return { tone: "below", label: `${formatBrl(Math.abs(delta))} abaixo` };
};

const stackFeeLabel = (stack: StackEvaluation): string =>
  stack.yearOneAnnualFeeBrl === 0
    ? "anuidade zero"
    : `anuidade ${formatBrl(stack.yearOneAnnualFeeBrl)}/ano`;

const alternativesHeroSentence = (tabs: AlternativeTab[], threshold: number): string => {
  const tab = tabs[0];
  const alternative = tab?.stacks[0];
  if (tab === undefined || alternative === undefined) {
    return `Nenhuma combinação do catálogo chega a ${formatAnnualBrl(threshold)} de diferença.`;
  }
  return `Outra escolha próxima: ${tab.label.toLowerCase()}, ${stackLabel(alternative)} entrega ${formatAnnualBrl(alternative.yearOneNetValueBrl)}.`;
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

const StackLabelLink = ({
  stack,
  cardClassName,
  separatorClassName,
}: {
  stack: StackEvaluation;
  cardClassName?: string;
  separatorClassName?: string;
}): JSX.Element => {
  const cards = cardsInUse(stack);
  return (
    <>
      {cards.map((card, i) => (
        <Fragment key={card.id}>
          {i > 0 ? (
            <span aria-hidden className={cn("font-normal", separatorClassName)}>
              {" + "}
            </span>
          ) : null}
          <Link
            to={`/cards/${card.id}`}
            className={cn(
              "hover:text-accent focus-visible:text-accent focus-visible:outline-accent transition-colors hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2",
              cardClassName,
            )}
          >
            {card.name}
          </Link>
        </Fragment>
      ))}
    </>
  );
};

const HeroDetailLinks = ({ stack }: { stack: StackEvaluation }): JSX.Element | null => {
  const cards = cardsInUse(stack);
  if (cards.length === 0) return null;
  const [singleCard] = cards;
  if (cards.length === 1 && singleCard !== undefined) {
    return (
      <p className="mt-5">
        <Link to={`/cards/${singleCard.id}`} className="plain-link">
          Detalhes do cartão →
        </Link>
      </p>
    );
  }
  return (
    <p className="text-ink-muted mt-5 text-sm">
      <span className="text-ink-subtle">Detalhes: </span>
      {cards.map((card, i) => (
        <Fragment key={card.id}>
          {i > 0 ? <span className="text-ink-subtle"> · </span> : null}
          <Link to={`/cards/${card.id}`} className="plain-link">
            {card.name}
          </Link>
        </Fragment>
      ))}
    </p>
  );
};

export const ResultsView = (): JSX.Element => {
  const { profile } = useSession();
  const result = useRecommendation();
  const [activeTabId, setActiveTabId] = useState<AlternativeTabId | null>(null);

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
  const accessibilitySummary = stackAccessibilitySummary(profile, topStack);
  const threshold = comparisonThreshold(topStack);
  const alternativeTabs = buildAlternativeTabs(displayRecommendation);
  const activeTab = alternativeTabs.find((tab) => tab.id === activeTabId) ?? alternativeTabs[0];
  // Per-card compatibility % for the "Mais semelhantes" tab — the closest card is 100%.
  const compatById =
    activeTab?.id === "most-similar" ? mostSimilarCompat(activeTab.stacks, topStack) : null;
  const divergenceNotice = preferenceDivergenceNotice(profile, displayRecommendation, threshold);
  const _conditionalUpside = decisionTracks?.conditionalUpside;
  // const conditionalUpsideNotice =
  //   _conditionalUpside !== undefined && stackId(_conditionalUpside) !== stackId(topStack)
  //     ? `Maior retorno modelado: ${stackLabel(_conditionalUpside)} entrega ${formatAnnualBrl(_conditionalUpside.yearOneNetValueBrl)}, mas depende de requisito de acesso.`
  //     : null;
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
    // conditionalUpsideNotice,
    divergenceNotice,
    alternativeTabs.length < 2 ? alternativesHeroSentence(alternativeTabs, threshold) : null,
  ].filter((note): note is string => note !== null);
  const travelTranslationMatchesTopStack = stackId(topStack) === stackId(recommendation.topStack);
  const showTravelTranslation =
    travelTranslationMatchesTopStack && recommendation.travelTranslation.program !== "cashback";
  const displayMoneyOnTheTableBrl =
    recommendation.currentStack !== undefined
      ? Math.max(0, topStack.yearOneNetValueBrl - recommendation.currentStack.yearOneNetValueBrl)
      : recommendation.moneyOnTheTableBrl;

  const hasCurrentComparison =
    (profile.currentCardIds?.length ?? 0) > 0 &&
    recommendation.currentStack !== undefined &&
    displayMoneyOnTheTableBrl !== undefined &&
    displayMoneyOnTheTableBrl > 0;

  const comparisonNarrative =
    hasCurrentComparison && recommendation.currentStack !== undefined
      ? buildComparisonNarrative(recommendation.currentStack, topStack)
      : null;
  const currentLabel =
    recommendation.currentStack !== undefined ? stackLabel(recommendation.currentStack) : "";
  const recommendedLabel = stackLabel(topStack);

  return (
    <main className="bg-surface text-ink-muted min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 md:py-12 lg:px-10">
        <header className="max-w-4xl">
          <p className="text-caption text-ink-subtle">{recommendationEyebrow}</p>
          <h1 className="text-display-2 text-ink mt-2 leading-[1.05]">{stackLabel(topStack)}</h1>
          <HeroDetailLinks stack={topStack} />
        </header>

        {comparisonNarrative !== null ? (
          <CurrentVsRecommended
            narrative={comparisonNarrative}
            currentLabel={currentLabel}
            recommendedLabel={recommendedLabel}
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

        <section className="border-line border-b py-8" aria-label="Acesso">
          <p className="text-ink-muted text-sm leading-relaxed">
            <span className="text-caption text-ink-subtle mb-1 block">Acesso</span>
            {accessibilitySummary}
          </p>
        </section>

        {alternativeTabs.length > 0 && activeTab !== undefined ? (
          <section className="border-line border-b py-8" aria-label="Outras escolhas">
            <h2 className="text-heading text-ink">Outras escolhas</h2>
            <div
              role="tablist"
              aria-label="Filtrar alternativas"
              className="border-line mt-6 flex flex-wrap gap-x-7 border-b"
            >
              {alternativeTabs.map((tab) => {
                const isActive = tab.id === activeTab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`alternatives-panel-${tab.id}`}
                    id={`alternatives-tab-${tab.id}`}
                    onClick={() => {
                      setActiveTabId(tab.id);
                    }}
                    className={cn(
                      "text-caption focus-visible:ring-accent -mb-px cursor-pointer border-b-2 pb-3 transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                      isActive
                        ? "border-ink text-ink"
                        : "hover:text-ink text-ink-subtle border-transparent",
                    )}
                  >
                    {tab.label}
                    <span className="tabular text-ink-subtle ml-2 text-xs font-normal">
                      {tab.stacks.length}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-ink-subtle mt-3 text-xs leading-relaxed">
              {TAB_DESCRIPTIONS[activeTab.id]}
            </p>
            <ol
              role="tabpanel"
              id={`alternatives-panel-${activeTab.id}`}
              aria-labelledby={`alternatives-tab-${activeTab.id}`}
              className="divide-line mt-3 divide-y text-sm"
            >
              {activeTab.stacks.map((stack) => {
                const delta = stackDelta(topStack, stack);
                const fee = stack.yearOneAnnualFeeBrl;
                const feeLabel = fee > 0 ? stackFeeLabel(stack) : null;
                const barrier = stackAccessBarrierLabel(stack);
                const compat = compatById?.get(stackId(stack));
                const valueTone = delta.tone === "above" ? "text-accent" : "text-ink";
                const deltaTone =
                  delta.tone === "above"
                    ? "text-accent"
                    : delta.tone === "even"
                      ? "text-ink"
                      : "text-ink-subtle";
                const metaParts: { key: string; node: JSX.Element }[] = [
                  {
                    key: "delta",
                    node: <span className={cn("tabular", deltaTone)}>{delta.label}</span>,
                  },
                ];
                if (feeLabel !== null) {
                  metaParts.push({
                    key: "fee",
                    node: <span className="text-ink-subtle">{feeLabel}</span>,
                  });
                }
                if (barrier !== null) {
                  metaParts.push({
                    key: "barrier",
                    node: <span className="text-warning">{barrier}</span>,
                  });
                }
                if (compat !== undefined) {
                  metaParts.push({
                    key: "compat",
                    node: <span className="text-ink-muted">{compat}% compatível</span>,
                  });
                }
                return (
                  <li
                    key={stackId(stack)}
                    className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1.5 py-3.5"
                  >
                    <span className="font-semibold">
                      <StackLabelLink
                        stack={stack}
                        cardClassName="text-ink"
                        separatorClassName="text-ink-subtle"
                      />
                    </span>
                    <span className={cn("text-num tabular font-semibold", valueTone)}>
                      {formatAnnualBrl(stack.yearOneNetValueBrl)}
                    </span>
                    <p className="text-ink-subtle col-span-2 text-xs leading-relaxed">
                      {metaParts.map((part, i) => (
                        <Fragment key={part.key}>
                          {i > 0 ? (
                            <span aria-hidden className="text-ink-subtle/60 mx-2">
                              ·
                            </span>
                          ) : null}
                          {part.node}
                        </Fragment>
                      ))}
                    </p>
                  </li>
                );
              })}
            </ol>
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

        {showTravelTranslation ? (
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
