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

export type AlternativeTabId = "highest-return" | "lowest-barrier";

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
  "highest-return": "Maior retorno líquido modelado — mesmo com barreiras adicionais.",
  "lowest-barrier":
    "Cartões ao seu alcance — sem exigência de acesso, ou dentro do que você informou que tem para investir.",
};

export const returnGapSentence = (topStack: StackEvaluation, stack: StackEvaluation): string => {
  const delta = stack.yearOneNetValueBrl - topStack.yearOneNetValueBrl;
  if (Math.abs(delta) < 0.01) return "Mesmo retorno líquido anual do recomendado.";
  if (delta > 0) return `${formatAnnualBrl(delta)} acima do recomendado.`;
  return `${formatAnnualBrl(Math.abs(delta))} abaixo do recomendado.`;
};

export const buildAlternativeTabs = (
  recommendation: Recommendation,
  profile: SpendingProfile,
): AlternativeTab[] => {
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

  // Both tabs feed `buildAlternativeLadder`, which does its own windowing — so they carry the
  // *full* (deduped, ranked) candidate set, not a pre-sliced top-N. "Menor barreira" keeps only the
  // cards this profile can actually obtain today (no access barrier, or within the declared
  // investable amount — undefined investable ⇒ treated as nothing, so only barrier-free cards).
  const ranked = (stacks: StackEvaluation[]): StackEvaluation[] =>
    dedupe(stacks).sort(compareCandidate);

  const tabs: AlternativeTab[] = [
    {
      id: "highest-return",
      label: "Maior retorno",
      stacks: ranked(pool),
    },
    {
      id: "lowest-barrier",
      label: "Menor barreira",
      stacks: ranked(pool.filter((stack) => isAccessibleForProfile(profile, stack))),
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

// ---------------------------------------------------------------------------
// "Your current card is already the best" reframing.
// ---------------------------------------------------------------------------

const engineTopStack = (recommendation: Recommendation): StackEvaluation =>
  recommendation.scoreLab?.decisionTracks?.recommendedNow ?? recommendation.topStack;

// True when the user already holds a stack whose net value ties or beats the highest-net stack the
// engine surfaced — so the page should reframe around their current card instead of pitching a
// lower-net "recommendation" (which would read as a downgrade).
export const currentCardIsBest = (
  recommendation: Recommendation,
  profile: SpendingProfile,
): boolean => {
  const current = recommendation.currentStack;
  if (current === undefined) return false;
  if ((profile.currentCardIds?.length ?? 0) === 0) return false;
  return current.yearOneNetValueBrl >= engineTopStack(recommendation).yearOneNetValueBrl - 0.01;
};

export interface CurrentCardUpside {
  stack: StackEvaluation;
  deltaBrl: number; // net gain over the current card
  gainPct: number; // rounded % gain over the current card's net (0 when net <= 0)
  requirementPhrase: string; // e.g. "R$ 30.000,00 investidos no emissor"
}

// Absurd barriers (e.g. R$ 1.000.000 private-banking thresholds) make a misleading "you'd gain X"
// pitch — cap what we'll dangle as a realistic upside.
const UPSIDE_BARRIER_CEILING_BRL = 1_000_000;

// The highest-net stack that out-earns the current card but sits behind a financial barrier this
// profile doesn't meet — the one card worth naming as "invest X and you'd do better". null when
// there's nothing decent (or nothing reachable-but-better) to surface.
export const bestUpsideForCurrentCard = (
  recommendation: Recommendation,
  profile: SpendingProfile,
): CurrentCardUpside | null => {
  const current = recommendation.currentStack;
  if (current === undefined) return null;
  const candidate = uniqueCandidatePool(recommendation)
    .filter((stack) => stack.yearOneNetValueBrl > current.yearOneNetValueBrl + 0.01)
    .filter((stack) => !isAccessibleForProfile(profile, stack))
    .filter((stack) => {
      const barrier = stackAccessBarrierBrl(stack);
      return barrier > 0 && barrier <= UPSIDE_BARRIER_CEILING_BRL;
    })
    .sort(compareCandidate)[0];
  if (candidate === undefined) return null;
  const phrase = stackAccessBarrierPhrase(candidate);
  if (phrase === null) return null;
  const deltaBrl = candidate.yearOneNetValueBrl - current.yearOneNetValueBrl;
  const gainPct =
    current.yearOneNetValueBrl > 0 ? Math.round((deltaBrl / current.yearOneNetValueBrl) * 100) : 0;
  return { stack: candidate, deltaBrl, gainPct, requirementPhrase: phrase };
};

export interface FullListRow {
  stack: StackEvaluation;
  rank: number; // 1-based position in the full ranked pool (global, never per-filter)
  isRecommended: boolean;
  isCurrent: boolean;
  deltaBrl: number; // vs recommended
}

// Full ranked universe = uniqueCandidatePool + the recommended + (if any) the current card, deduped,
// sorted by compareCandidate. `rank` is over this universe; filtering happens in the UI, ranks stay
// global. `anchorStack` overrides which row counts as "recommended" and what deltas are measured
// against (used when the current card is the best — see currentCardIsBest).
export const buildAlternativesFullList = (
  recommendation: Recommendation,
  options?: { anchorStack?: StackEvaluation },
): FullListRow[] => {
  const top = options?.anchorStack ?? recommendation.topStack;
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
