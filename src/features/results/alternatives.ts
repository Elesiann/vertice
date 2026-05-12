import { formatBrl, formatUsd } from "@/lib/format";
import type {
  Bank,
  ProgramId,
  PublicStackCard,
  Recommendation,
  RedemptionPreference,
  SpendingProfile,
  StackEvaluation,
} from "@/types";

const ALTERNATIVE_THRESHOLD_FLOOR_BRL = 1_500;

export const PROGRAM_LABEL: Partial<Record<ProgramId, string>> = {
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

export const MILES_PROGRAMS = new Set<ProgramId>([
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

export type AlternativeTabId =
  | "lowest-barrier"
  | "traditional"
  | "fintech"
  | "highest-return"
  | "most-similar";

export interface AlternativeTab {
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

export const ALTERNATIVES_PER_TAB = 5;

export const cardsInUse = (stack: StackEvaluation): StackEvaluation["cards"] => {
  const activeCards = stack.cards.filter((card) => {
    const alloc = stack.allocation.find((item) => item.cardId === card.id);
    return (
      alloc !== undefined && (alloc.monthlyDomesticBrl > 0 || alloc.monthlyInternationalUsd > 0)
    );
  });
  return activeCards.length > 0 ? activeCards : stack.cards;
};

export const stackId = (stack: StackEvaluation): string =>
  cardsInUse(stack)
    .map((card) => card.id)
    .slice()
    .sort()
    .join("|");

export const stackLabel = (stack: StackEvaluation): string =>
  cardsInUse(stack)
    .map((card) => card.name)
    .join(" + ");

export const primaryProgram = (stack: StackEvaluation): ProgramId | undefined =>
  cardsInUse(stack)[0]?.pointsProgram ?? stack.cards[0]?.pointsProgram;

const titleCaseProgram = (program: ProgramId): string =>
  program
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const programRedemptionLabel = (program: ProgramId | undefined): string => {
  if (program === undefined) return "outro programa";
  if (program === "cashback") return "cashback";
  const brand = PROGRAM_LABEL[program] ?? titleCaseProgram(program);
  return `${MILES_PROGRAMS.has(program) ? "milhas" : "pontos"} ${brand}`;
};

export const preferenceLabel = (redemption: RedemptionPreference): string => {
  if (redemption.kind === "cashback") return "cashback";
  if (redemption.kind === "miles") return programRedemptionLabel(redemption.program);
  return "sem preferência";
};

export const stackMatchesPreference = (
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

export const stackInvestmentRequirementLabel = (stack: StackEvaluation): string => {
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

export const stackAccessibilitySummary = (
  profile: SpendingProfile,
  stack: StackEvaluation,
): string => {
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

export const formatAnnualBrl = (value: number): string => `${formatBrl(value)}/ano`;

export const comparisonThreshold = (topStack: StackEvaluation): number =>
  Math.max(ALTERNATIVE_THRESHOLD_FLOOR_BRL, topStack.yearOneNetValueBrl * 0.25);

export const compareCandidate = (a: StackEvaluation, b: StackEvaluation): number => {
  if (a.yearOneNetValueBrl !== b.yearOneNetValueBrl) {
    return b.yearOneNetValueBrl - a.yearOneNetValueBrl;
  }
  const scoreA = a.scoreLab?.score ?? 0;
  const scoreB = b.scoreLab?.score ?? 0;
  if (scoreA !== scoreB) return scoreB - scoreA;
  return stackId(a).localeCompare(stackId(b));
};

export const uniqueCandidatePool = (recommendation: Recommendation): StackEvaluation[] => {
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

export const hasNoInvestmentBarrier = (stack: StackEvaluation): boolean =>
  cardsInUse(stack).every(
    (card) =>
      (card.minInvestmentBrl ?? 0) <= 0 &&
      (card.minInvestmentUsd ?? 0) <= 0 &&
      (card.requiredInvestmentBrl ?? 0) <= 0 &&
      (card.requiredInvestmentUsd ?? 0) <= 0,
  );

export const stackIsTraditional = (stack: StackEvaluation): boolean => {
  const cards = cardsInUse(stack);
  return cards.length > 0 && cards.every(cardIsTraditional);
};

export const stackIsFintech = (stack: StackEvaluation): boolean => {
  const cards = cardsInUse(stack);
  return cards.length > 0 && cards.every((card) => !cardIsTraditional(card));
};

export const stackAccessBarrierBrl = (stack: StackEvaluation): number =>
  cardsInUse(stack).reduce((max, card) => {
    const min = card.minInvestmentBrl ?? 0;
    const investmentRelationship =
      card.requiresRelationship === "investment" || card.requiresRelationship === "private";
    const required = investmentRelationship ? (card.requiredInvestmentBrl ?? 0) : 0;
    return Math.max(max, min, required);
  }, 0);

// The access barrier as a bare noun phrase ("R$ 50.000,00 investidos no emissor" / "private
// banking"), so callers can compose it ("exige …", "exigem …"). null when there's no barrier.
export const stackAccessBarrierPhrase = (stack: StackEvaluation): string | null => {
  for (const card of cardsInUse(stack)) {
    if ((card.minInvestmentBrl ?? 0) > 0) {
      return `${formatBrl(card.minInvestmentBrl ?? 0)} investidos no emissor`;
    }
    const investmentRelationship =
      card.requiresRelationship === "investment" || card.requiresRelationship === "private";
    if (investmentRelationship && (card.requiredInvestmentBrl ?? 0) > 0) {
      return `${formatBrl(card.requiredInvestmentBrl ?? 0)} investidos no emissor`;
    }
    if (card.requiresRelationship === "private") {
      return "private banking";
    }
  }
  return null;
};

export const stackAccessBarrierLabel = (stack: StackEvaluation): string | null => {
  const phrase = stackAccessBarrierPhrase(stack);
  return phrase === null ? null : `exige ${phrase}`;
};

// Whether this profile can actually obtain the stack today — i.e. no private-banking gate and the
// investment barrier is within the declared investable amount (undefined ⇒ treated as nothing).
export const isAccessibleForProfile = (
  profile: SpendingProfile,
  stack: StackEvaluation,
): boolean => {
  if (cardsInUse(stack).some((card) => card.requiresRelationship === "private")) return false;
  return stackAccessBarrierBrl(stack) <= (profile.availableToInvestBrl ?? 0);
};

export const TAB_DESCRIPTIONS: Record<AlternativeTabId, string> = {
  "lowest-barrier": "Cartões com a mesma exigência de acesso do recomendado, ou menor.",
  traditional:
    "Cartões emitidos por Itaú, Bradesco, Santander ou Banco do Brasil sob a marca do banco.",
  fintech: "Bancos digitais, fintechs e produtos cobranded.",
  "highest-return": "Maior retorno líquido modelado — mesmo com barreiras adicionais.",
  "most-similar": "Cartões com o perfil de uso mais parecido com o recomendado.",
};

export const returnGapSentence = (topStack: StackEvaluation, stack: StackEvaluation): string => {
  const delta = stack.yearOneNetValueBrl - topStack.yearOneNetValueBrl;
  if (Math.abs(delta) < 0.01) return "Mesmo retorno líquido anual do recomendado.";
  if (delta > 0) return `${formatAnnualBrl(delta)} acima do recomendado.`;
  return `${formatAnnualBrl(Math.abs(delta))} abaixo do recomendado.`;
};

// Closest-by-score card = 100%; roughly one extra score-point of distance costs one
// percentage point; clamped to [0, 100]. The raw score itself is never displayed.
export const mostSimilarCompat = (
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

export const buildAlternativeTabs = (recommendation: Recommendation): AlternativeTab[] => {
  const topStack = recommendation.topStack;
  const pool = uniqueCandidatePool(recommendation);

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

  // The ladder tabs feed `buildAlternativeLadder`, which does its own windowing — so they carry the
  // *full* (deduped, ranked) candidate set, not a pre-sliced top-N. Slicing here is what made
  // "Maior retorno" collapse to just the anchors when the top-N happened to be all gated-above cards.
  const ranked = (stacks: StackEvaluation[]): StackEvaluation[] =>
    dedupe(stacks).sort(compareCandidate);

  const recBarrier = stackAccessBarrierBrl(topStack);
  const lowerBarrier = (stack: StackEvaluation): boolean =>
    recBarrier === 0 ? hasNoInvestmentBarrier(stack) : stackAccessBarrierBrl(stack) <= recBarrier;

  // "Mais semelhantes" ranks the full pool by score proximity — it's a usage-fit lens, not a return
  // lens — and stays a flat top-N list. Cards without a score drop out.
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
      stacks: ranked(pool.filter(lowerBarrier)),
    },
    {
      id: "most-similar",
      label: "Mais semelhantes",
      stacks: mostSimilarStacks,
    },
    {
      id: "highest-return",
      label: "Maior retorno",
      stacks: ranked(pool),
    },
  ];

  return tabs.filter((tab) => tab.stacks.length > 0);
};

export type DeltaTone = "above" | "even" | "below";

export const stackDelta = (
  topStack: StackEvaluation,
  stack: StackEvaluation,
): { tone: DeltaTone; label: string } => {
  const delta = stack.yearOneNetValueBrl - topStack.yearOneNetValueBrl;
  if (Math.abs(delta) < 0.01) return { tone: "even", label: "mesmo retorno" };
  if (delta > 0) return { tone: "above", label: `${formatBrl(delta)} acima` };
  return { tone: "below", label: `${formatBrl(Math.abs(delta))} abaixo` };
};

export const stackFeeLabel = (stack: StackEvaluation): string =>
  stack.yearOneAnnualFeeBrl === 0
    ? "anuidade zero"
    : `anuidade ${formatBrl(stack.yearOneAnnualFeeBrl)}/ano`;

export const alternativesHeroSentence = (tabs: AlternativeTab[], threshold: number): string => {
  const tab = tabs[0];
  const alternative = tab?.stacks[0];
  if (tab === undefined || alternative === undefined) {
    return `Nenhuma combinação do catálogo chega a ${formatAnnualBrl(threshold)} de diferença.`;
  }
  return `Outra escolha próxima: ${tab.label.toLowerCase()}, ${stackLabel(alternative)} entrega ${formatAnnualBrl(alternative.yearOneNetValueBrl)}.`;
};

// ---------------------------------------------------------------------------
// Anchored ladder model for "Outras escolhas".
// ---------------------------------------------------------------------------

export const GAP_COLLAPSE_MIN = 2;
export const LADDER_BELOW_RECOMMENDED = 3;

export type LadderRow =
  | { kind: "card"; stack: StackEvaluation; deltaBrl: number }
  | { kind: "above-summary"; count: number }
  | { kind: "recommended"; stack: StackEvaluation }
  | { kind: "current"; stack: StackEvaluation; deltaBrl: number }
  | { kind: "gap"; count: number };

interface BuildLadderArgs {
  pool: StackEvaluation[]; // tab-filtered candidate set; must NOT contain the recommended
  topStack: StackEvaluation; // the recommended
  currentStack?: StackEvaluation | undefined;
  gapCollapseMin: number; // below this many hidden cards, render contiguously (no gap row)
  belowRecommendedCount: number; // how many "best alternative" rows directly under the recommended
}

export const buildAlternativeLadder = ({
  pool,
  topStack,
  currentStack,
  gapCollapseMin,
  belowRecommendedCount,
}: BuildLadderArgs): LadderRow[] => {
  // 1. Full ranked list, deduped by stackId, with the recommended and (if any) current card.
  const ranked: StackEvaluation[] = [];
  const seen = new Set<string>();
  for (const s of [topStack, ...pool, ...(currentStack ? [currentStack] : [])]) {
    const id = stackId(s);
    if (seen.has(id)) continue;
    seen.add(id);
    ranked.push(s);
  }
  ranked.sort(compareCandidate);

  const recIdx = ranked.findIndex((s) => stackId(s) === stackId(topStack));
  const curIdx =
    currentStack === undefined ? -1 : ranked.findIndex((s) => stackId(s) === stackId(currentStack));
  const deltaVsRec = (s: StackEvaluation): number =>
    s.yearOneNetValueBrl - topStack.yearOneNetValueBrl;

  const rows: LadderRow[] = [];

  // 2. Above the recommended (higher net value — typically gated). First as a row, rest as a summary.
  const above = ranked.slice(0, recIdx);
  const firstAbove = above[0];
  if (above.length === 1 && firstAbove !== undefined) {
    rows.push({ kind: "card", stack: firstAbove, deltaBrl: deltaVsRec(firstAbove) });
  } else if (above.length > 1) {
    rows.push({ kind: "above-summary", count: above.length });
  }

  // 3. The recommended.
  rows.push({ kind: "recommended", stack: topStack });

  // 4. Everything below.
  // No current card (or current card not actually below the recommended): just take the best ones.
  if (currentStack === undefined || curIdx <= recIdx) {
    for (const s of ranked.slice(recIdx + 1, recIdx + 1 + Math.max(belowRecommendedCount, 4))) {
      rows.push({ kind: "card", stack: s, deltaBrl: deltaVsRec(s) });
    }
    return rows;
  }

  // Current card is below the recommended.
  const topBelowEnd = recIdx + belowRecommendedCount; // last index of the "best alternatives" block
  const nearCurrentIdx = curIdx - 1; // the card immediately above the current one
  const hiddenStart = topBelowEnd + 1;
  const hiddenEnd = nearCurrentIdx - 1; // exclusive of the "near current" row
  const hiddenCount = Math.max(0, hiddenEnd - hiddenStart + 1);

  if (hiddenCount > gapCollapseMin) {
    for (const s of ranked.slice(recIdx + 1, topBelowEnd + 1)) {
      rows.push({ kind: "card", stack: s, deltaBrl: deltaVsRec(s) });
    }
    rows.push({ kind: "gap", count: hiddenCount });
    if (nearCurrentIdx > topBelowEnd) {
      const near = ranked[nearCurrentIdx];
      if (near !== undefined) rows.push({ kind: "card", stack: near, deltaBrl: deltaVsRec(near) });
    }
  } else {
    // Small (or no) gap: contiguous ladder from the recommended down to the card just above current.
    for (const s of ranked.slice(recIdx + 1, nearCurrentIdx + 1)) {
      rows.push({ kind: "card", stack: s, deltaBrl: deltaVsRec(s) });
    }
  }

  rows.push({ kind: "current", stack: currentStack, deltaBrl: deltaVsRec(currentStack) });

  const belowCurrent = ranked[curIdx + 1];
  if (belowCurrent !== undefined) {
    rows.push({ kind: "card", stack: belowCurrent, deltaBrl: deltaVsRec(belowCurrent) });
  }

  return rows;
};

export interface FullListRow {
  stack: StackEvaluation;
  rank: number; // 1-based position in the full ranked pool (global, never per-filter)
  isRecommended: boolean;
  isCurrent: boolean;
  deltaBrl: number; // vs recommended
}

// Full ranked universe = uniqueCandidatePool + the recommended + (if any) the current card, deduped,
// sorted by compareCandidate. `rank` is over this universe; filtering happens in the UI, ranks stay global.
export const buildAlternativesFullList = (recommendation: Recommendation): FullListRow[] => {
  const top = recommendation.topStack;
  const current = recommendation.currentStack;
  const ranked: StackEvaluation[] = [];
  const seen = new Set<string>();
  for (const s of [top, ...uniqueCandidatePool(recommendation), ...(current ? [current] : [])]) {
    const id = stackId(s);
    if (seen.has(id)) continue;
    seen.add(id);
    ranked.push(s);
  }
  ranked.sort(compareCandidate);
  return ranked.map((stack, i) => ({
    stack,
    rank: i + 1,
    isRecommended: stackId(stack) === stackId(top),
    isCurrent: current !== undefined && stackId(stack) === stackId(current),
    deltaBrl: stack.yearOneNetValueBrl - top.yearOneNetValueBrl,
  }));
};
