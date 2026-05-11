import { formatBrl } from "@/lib/format";
import type {
  StackEvaluation,
  ScoreLabVerdictKind,
  ScoreLabRequirement,
  BenefitBreakdown,
} from "@/types";

export type DiagnosisVariant = "current-negative" | "current-positive";

export type ComparisonRowKey =
  | "cashback"
  | "points"
  | "travel-benefit"
  | "annual-fee"
  | "fx-iof"
  | "net";

// The dominant difference is usually one row, but when the two cards earn in different currencies
// (cashback vs points) the split rows each have one side artificially zero — comparing them is
// apples-to-oranges, so we surface a single "rewards" comparison of the two modeled reward values.
export type DominantKey = ComparisonRowKey | "rewards";

export interface BenefitBreakdownPart {
  label: string; // "Sala VIP" | "Seguro" | "Bagagem"
  count: number;
  demanded: number; // visits/trips the traveler would use; equals count when the card isn't capped
  unitBrl: number;
  totalBrl: number;
}

export type FeeStatus = "no-fee" | "waived" | "charged";

export interface FeeWaiverRoute {
  /** "spend" = monthly spend at the issuer; "invest" = lump sum invested at the issuer. */
  kind: "spend" | "invest";
  amountBrl: number;
}

export interface FeeDetail {
  status: FeeStatus;
  /** Annual fee actually charged this year — > 0 only when status is "charged"; 0 otherwise. */
  annualBrl: number;
  /** For "waived" these are the satisfied condition(s); for "charged" the escape routes. Empty when none apply. */
  routes: FeeWaiverRoute[];
  /** When a spend escape route exists but the user falls short (0 < available < required): their current monthly spend. */
  spendShortfallAvailableBrl?: number;
}

export interface ComparisonRow {
  key: ComparisonRowKey;
  label: string;
  currentValueBrl: number;
  recommendedValueBrl: number;
  currentFeeDetail?: FeeDetail;
  recommendedFeeDetail?: FeeDetail;
  currentBreakdown?: BenefitBreakdownPart[];
  recommendedBreakdown?: BenefitBreakdownPart[];
  tone?: "current-better" | "recommended-better" | "tie";
}

export interface ComparisonNarrative {
  variant: DiagnosisVariant;
  diagnosis: string[];
  rows: ComparisonRow[];
  verdictBrl: number;
  dominantRowKey: DominantKey | null;
  monthlySpendBrl: number;
  monthlyInternationalUsd: number;
  currentVerdict?: { kind: ScoreLabVerdictKind; label: string };
  recommendedVerdict?: { kind: ScoreLabVerdictKind; label: string };
  currentBreakEvenMonthlySpendBrl: number | null;
  currentRoiMultiple: number | null;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const grossValue = (stack: StackEvaluation): number =>
  stack.scoreLab?.modeledAnnual.grossValueBrl ?? stack.yearOneTotalValueBrl;

const benefitValue = (stack: StackEvaluation): number =>
  stack.scoreLab?.modeledAnnual.benefitUtilityBrl ?? 0;

const fxValue = (stack: StackEvaluation): number =>
  stack.scoreLab?.modeledAnnual.internationalCostBrl ?? 0;

const isCashbackStack = (stack: StackEvaluation): boolean =>
  stack.cards[0]?.pointsProgram === "cashback";

// "de cashback" / "em pontos" — labels the reward kind in the rewards-comparison sentence.
const rewardClause = (stack: StackEvaluation): string =>
  isCashbackStack(stack) ? "de cashback" : "em pontos";

const recommendedFeeClause = (topStack: StackEvaluation): string => {
  const fee = topStack.yearOneAnnualFeeBrl;
  if (fee <= 0) return "sem anuidade";
  return `com ${formatBrl(fee)} de anuidade`;
};

// ─── benefit breakdown parts ─────────────────────────────────────────────────
// Mirrors the `benefitParts` derivation in ResultsView.heroWaiverHint / benefitParts (~line 648).

const benefitBreakdownParts = (stack: StackEvaluation): BenefitBreakdownPart[] => {
  const bd: BenefitBreakdown | undefined = stack.scoreLab?.modeledAnnual.benefitBreakdown;
  if (bd === undefined) return [];
  const parts: BenefitBreakdownPart[] = [];
  if (bd.lounge.totalBrl > 0)
    parts.push({
      label: "Sala VIP",
      count: bd.lounge.count,
      demanded: bd.lounge.demanded ?? bd.lounge.count,
      unitBrl: bd.lounge.unitBrl,
      totalBrl: bd.lounge.totalBrl,
    });
  if (bd.insurance.totalBrl > 0)
    parts.push({
      label: "Seguro",
      count: bd.insurance.count,
      demanded: bd.insurance.demanded ?? bd.insurance.count,
      unitBrl: bd.insurance.unitBrl,
      totalBrl: bd.insurance.totalBrl,
    });
  if (bd.baggage.totalBrl > 0)
    parts.push({
      label: "Bagagem",
      count: bd.baggage.count,
      demanded: bd.baggage.demanded ?? bd.baggage.count,
      unitBrl: bd.baggage.unitBrl,
      totalBrl: bd.baggage.totalBrl,
    });
  return parts;
};

// ─── fee detail ───────────────────────────────────────────────────────────────
// Structured data (not a baked string): the component decides how to render it.
// Symmetric — every stack gets a FeeDetail, regardless of whether its fee is 0 or > 0.

const routeFromRequirement = (req: ScoreLabRequirement): FeeWaiverRoute | null => {
  if (req.kind === "spend-fee-waiver") return { kind: "spend", amountBrl: req.required };
  if (req.kind === "investment-fee-waiver") return { kind: "invest", amountBrl: req.required };
  return null;
};

const feeDetail = (stack: StackEvaluation): FeeDetail => {
  const fee = stack.yearOneAnnualFeeBrl;

  if (fee === 0) {
    // Fee is zero — either genuinely waived (a fee exists, the profile clears it) or a no-fee card.
    const waiver = stack.scoreLab?.benefitsApplied.find(
      (b) => b.kind === "annual-fee-waiver" && b.valueBrl > 0,
    );
    if (waiver?.requirement === undefined) {
      return { status: "no-fee", annualBrl: 0, routes: [] };
    }
    const routes: FeeWaiverRoute[] = [];
    const primary = routeFromRequirement(waiver.requirement);
    if (primary !== null) routes.push(primary);
    // The alternative route (the other kind, when offered) lives in `requirements`.
    const otherKind =
      waiver.requirement.kind === "spend-fee-waiver" ? "investment-fee-waiver" : "spend-fee-waiver";
    const alt = (stack.scoreLab?.requirements ?? []).find((r) => r.kind === otherKind);
    const altRoute = alt !== undefined ? routeFromRequirement(alt) : null;
    if (altRoute !== null) routes.push(altRoute);
    return { status: "waived", annualBrl: 0, routes };
  }

  // Fee is > 0 — charged. Surface escape routes (if any) and whether the user falls short on spend.
  const reqs = stack.scoreLab?.requirements ?? [];
  const investReq = reqs.find((r) => r.kind === "investment-fee-waiver");
  const spendReq = reqs.find((r) => r.kind === "spend-fee-waiver");
  const routes: FeeWaiverRoute[] = [];
  if (investReq !== undefined) routes.push({ kind: "invest", amountBrl: investReq.required });
  if (spendReq !== undefined) routes.push({ kind: "spend", amountBrl: spendReq.required });

  return {
    status: "charged",
    annualBrl: fee,
    routes,
    ...(spendReq !== undefined && spendReq.available > 0 && spendReq.available < spendReq.required
      ? { spendShortfallAvailableBrl: spendReq.available }
      : {}),
  };
};

// ─── row tone ─────────────────────────────────────────────────────────────────

const rowTone = (
  currentValueBrl: number,
  recommendedValueBrl: number,
): "current-better" | "recommended-better" | "tie" => {
  const diff = recommendedValueBrl - currentValueBrl;
  if (Math.abs(diff) < 0.01) return "tie";
  return diff > 0 ? "recommended-better" : "current-better";
};

// ─── dominant difference ──────────────────────────────────────────────────────

const computeDominant = (rows: ComparisonRow[]): DominantKey | null => {
  const cashbackRow = rows.find((r) => r.key === "cashback");
  const pointsRow = rows.find((r) => r.key === "points");
  // Both reward rows present iff the two cards earn in different currencies. Then each row has one
  // side artificially zero, so they're folded into a single "rewards" candidate below.
  const mixedRewards =
    cashbackRow !== undefined && pointsRow !== undefined ? { cashbackRow, pointsRow } : null;

  let best: DominantKey | undefined;
  let bestDiff = 0;
  for (const row of rows) {
    if (row.key === "net") continue;
    if (mixedRewards !== null && (row.key === "cashback" || row.key === "points")) continue;
    const d = Math.abs(row.recommendedValueBrl - row.currentValueBrl);
    if (best === undefined || d > bestDiff) {
      best = row.key;
      bestDiff = d;
    }
  }

  if (mixedRewards !== null) {
    const curGross =
      mixedRewards.cashbackRow.currentValueBrl + mixedRewards.pointsRow.currentValueBrl;
    const recGross =
      mixedRewards.cashbackRow.recommendedValueBrl + mixedRewards.pointsRow.recommendedValueBrl;
    const rewardsDiff = Math.abs(recGross - curGross);
    if (best === undefined || rewardsDiff > bestDiff) {
      best = "rewards";
      bestDiff = rewardsDiff;
    }
  }

  if (best === undefined || bestDiff < 0.01) return null;
  return best;
};

// ─── diagnosis sentences ──────────────────────────────────────────────────────

// Returns the "em"+article contraction ("na"/"no"/"nos") so it slots into "A maior diferença está ___:".
const dominantFrase = (key: ComparisonRowKey): string => {
  switch (key) {
    case "cashback":
      return "no cashback";
    case "points":
      return "nos pontos";
    case "travel-benefit":
      return "nos benefícios de viagem";
    case "annual-fee":
      return "na anuidade";
    case "fx-iof":
      return "no custo de câmbio";
    // "net" is filtered out before dominantFrase is called; case exists for exhaustiveness.
    case "net":
      return "no líquido";
  }
};

// For fee/fx rows the row values are negated costs; revert to raw positive amounts for prose.
const rawForProse = (key: ComparisonRowKey, valueBrl: number): number => {
  if (key === "annual-fee" || key === "fx-iof") return Math.abs(valueBrl);
  return valueBrl;
};

const sentence1 = (
  domKey: DominantKey,
  rows: ComparisonRow[],
  currentStack: StackEvaluation,
  topStack: StackEvaluation,
): string | null => {
  if (domKey === "rewards") {
    return `A maior diferença está nas recompensas: ${formatBrl(grossValue(currentStack))} ${rewardClause(currentStack)} no atual, ${formatBrl(grossValue(topStack))} ${rewardClause(topStack)} no recomendado.`;
  }
  const row = rows.find((r) => r.key === domKey);
  if (row === undefined) return null;
  const currentRaw = rawForProse(domKey, row.currentValueBrl);
  const recommendedRaw = rawForProse(domKey, row.recommendedValueBrl);
  return `A maior diferença está ${dominantFrase(domKey)}: ${formatBrl(currentRaw)} no atual, ${formatBrl(recommendedRaw)} no recomendado.`;
};

const sentence2VariantA = (currentStack: StackEvaluation, topStack: StackEvaluation): string => {
  const loss = formatBrl(Math.abs(currentStack.yearOneNetValueBrl));
  const rec = formatBrl(topStack.yearOneNetValueBrl);
  const feeClause = recommendedFeeClause(topStack);
  return `Seu cartão atual fica negativo em ${loss}/ano. O recomendado renderia ${rec} líquido/ano ${feeClause}.`;
};

const sentence2VariantB = (currentStack: StackEvaluation, topStack: StackEvaluation): string => {
  const cur = formatBrl(currentStack.yearOneNetValueBrl);
  const rec = formatBrl(topStack.yearOneNetValueBrl);
  return `Seu cartão atual rende ${cur}/ano. O recomendado renderia ${rec}/ano com o mesmo gasto.`;
};

const variantANarrative = (
  currentStack: StackEvaluation,
  topStack: StackEvaluation,
  domKey: DominantKey | null,
  rows: ComparisonRow[],
): string[] => {
  const s2 = sentence2VariantA(currentStack, topStack);
  if (domKey === null) return [s2];
  const s1 = sentence1(domKey, rows, currentStack, topStack);
  return s1 === null ? [s2] : [s1, s2];
};

const variantBNarrative = (
  currentStack: StackEvaluation,
  topStack: StackEvaluation,
  domKey: DominantKey | null,
  rows: ComparisonRow[],
): string[] => {
  const s2 = sentence2VariantB(currentStack, topStack);
  if (domKey === null) return [s2];
  const s1 = sentence1(domKey, rows, currentStack, topStack);
  return s1 === null ? [s2] : [s1, s2];
};

// ─── build rows ───────────────────────────────────────────────────────────────

const buildRows = (currentStack: StackEvaluation, topStack: StackEvaluation): ComparisonRow[] => {
  const rows: ComparisonRow[] = [];

  const currentGross = grossValue(currentStack);
  const recommendedGross = grossValue(topStack);
  const currentIsCashback = isCashbackStack(currentStack);
  const recommendedIsCashback = isCashbackStack(topStack);

  const cashbackCurrent = currentIsCashback ? currentGross : 0;
  const cashbackRecommended = recommendedIsCashback ? recommendedGross : 0;
  if (cashbackCurrent > 0 || cashbackRecommended > 0) {
    rows.push({
      key: "cashback",
      label: "Cashback",
      currentValueBrl: cashbackCurrent,
      recommendedValueBrl: cashbackRecommended,
      tone: rowTone(cashbackCurrent, cashbackRecommended),
    });
  }

  const pointsCurrent = currentIsCashback ? 0 : currentGross;
  const pointsRecommended = recommendedIsCashback ? 0 : recommendedGross;
  if (pointsCurrent > 0 || pointsRecommended > 0) {
    rows.push({
      key: "points",
      label: "Pontos/milhas",
      currentValueBrl: pointsCurrent,
      recommendedValueBrl: pointsRecommended,
      tone: rowTone(pointsCurrent, pointsRecommended),
    });
  }

  const travelCurrent = benefitValue(currentStack);
  const travelRecommended = benefitValue(topStack);
  if (travelCurrent > 0 || travelRecommended > 0) {
    rows.push({
      key: "travel-benefit",
      label: "Benefício de viagem",
      currentValueBrl: travelCurrent,
      recommendedValueBrl: travelRecommended,
      currentBreakdown: benefitBreakdownParts(currentStack),
      recommendedBreakdown: benefitBreakdownParts(topStack),
      tone: rowTone(travelCurrent, travelRecommended),
    });
  }

  const feeCurrent = currentStack.yearOneAnnualFeeBrl;
  const feeRecommended = topStack.yearOneAnnualFeeBrl;
  if (feeCurrent > 0 || feeRecommended > 0) {
    const currentValueBrl = feeCurrent > 0 ? -feeCurrent : 0;
    const recommendedValueBrl = feeRecommended > 0 ? -feeRecommended : 0;
    rows.push({
      key: "annual-fee",
      label: "Anuidade",
      currentValueBrl,
      recommendedValueBrl,
      currentFeeDetail: feeDetail(currentStack),
      recommendedFeeDetail: feeDetail(topStack),
      tone: rowTone(currentValueBrl, recommendedValueBrl),
    });
  }

  const fxCurrent = fxValue(currentStack);
  const fxRecommended = fxValue(topStack);
  if (fxCurrent > 0 || fxRecommended > 0) {
    const currentValueBrl = fxCurrent > 0 ? -fxCurrent : 0;
    const recommendedValueBrl = fxRecommended > 0 ? -fxRecommended : 0;
    rows.push({
      key: "fx-iof",
      label: "FX/IOF",
      currentValueBrl,
      recommendedValueBrl,
      tone: rowTone(currentValueBrl, recommendedValueBrl),
    });
  }

  // net row intentionally has no tone
  rows.push({
    key: "net",
    label: "Líquido anual",
    currentValueBrl: currentStack.yearOneNetValueBrl,
    recommendedValueBrl: topStack.yearOneNetValueBrl,
  });

  return rows;
};

// ─── public API ───────────────────────────────────────────────────────────────

export const buildComparisonNarrative = (
  currentStack: StackEvaluation,
  topStack: StackEvaluation,
): ComparisonNarrative => {
  const variant: DiagnosisVariant =
    currentStack.yearOneNetValueBrl <= 0 ? "current-negative" : "current-positive";

  const rows = buildRows(currentStack, topStack);
  const domKey = computeDominant(rows);

  const diagnosis =
    variant === "current-negative"
      ? variantANarrative(currentStack, topStack, domKey, rows)
      : variantBNarrative(currentStack, topStack, domKey, rows);

  const currentVerdictRaw = currentStack.scoreLab?.verdict;
  const recommendedVerdictRaw = topStack.scoreLab?.verdict;

  return {
    variant,
    diagnosis,
    rows,
    verdictBrl: topStack.yearOneNetValueBrl - currentStack.yearOneNetValueBrl,
    dominantRowKey: domKey,
    monthlySpendBrl: topStack.allocation[0]?.monthlyDomesticBrl ?? 0,
    monthlyInternationalUsd: topStack.allocation[0]?.monthlyInternationalUsd ?? 0,
    ...(currentVerdictRaw !== undefined
      ? { currentVerdict: { kind: currentVerdictRaw.kind, label: currentVerdictRaw.label } }
      : {}),
    ...(recommendedVerdictRaw !== undefined
      ? {
          recommendedVerdict: {
            kind: recommendedVerdictRaw.kind,
            label: recommendedVerdictRaw.label,
          },
        }
      : {}),
    currentBreakEvenMonthlySpendBrl: currentStack.scoreLab?.breakEvenMonthlySpendBrl ?? null,
    currentRoiMultiple: currentStack.scoreLab?.roiMultiple ?? null,
  };
};
