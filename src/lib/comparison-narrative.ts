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

export interface BenefitBreakdownPart {
  label: string; // "Sala VIP" | "Seguro" | "Bagagem"
  count: number;
  demanded: number; // visits/trips the traveler would use; equals count when the card isn't capped
  unitBrl: number;
  totalBrl: number;
}

export interface ComparisonRow {
  key: ComparisonRowKey;
  label: string;
  currentValueBrl: number;
  recommendedValueBrl: number;
  currentSubLabel?: string;
  recommendedSubLabel?: string;
  currentBreakdown?: BenefitBreakdownPart[];
  recommendedBreakdown?: BenefitBreakdownPart[];
  tone?: "current-better" | "recommended-better" | "tie";
}

export interface ComparisonNarrative {
  variant: DiagnosisVariant;
  diagnosis: string[];
  rows: ComparisonRow[];
  verdictBrl: number;
  dominantRowKey: ComparisonRowKey | null;
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

// ─── fee waiver sub-lines ─────────────────────────────────────────────────────
// Symmetric helper: returns a descriptive string for ANY stack regardless of whether its fee
// is 0 (waived/no-fee) or > 0 (charged). Generic — no hardcoded card names.

const feeSubLine = (stack: StackEvaluation): string => {
  if (stack.yearOneAnnualFeeBrl === 0) {
    // Fee is zero — either genuinely waived or a no-fee card.
    const waiver = stack.scoreLab?.benefitsApplied.find(
      (b) => b.kind === "annual-fee-waiver" && b.valueBrl > 0,
    );
    if (waiver !== undefined) {
      const req = waiver.requirement;
      if (req?.kind === "spend-fee-waiver") {
        let base = `isenta: gasto de ${formatBrl(req.required)}/mês satisfaz`;
        const altInvest = stack.scoreLab?.requirements.find(
          (r: ScoreLabRequirement) => r.kind === "investment-fee-waiver",
        );
        if (altInvest !== undefined) {
          base += ` (alternativa: ${formatBrl(altInvest.required)} investidos)`;
        }
        return base;
      } else if (req?.kind === "investment-fee-waiver") {
        let base = `isenta: ${formatBrl(req.required)} investidos no emissor satisfazem`;
        const altSpend = stack.scoreLab?.requirements.find(
          (r: ScoreLabRequirement) => r.kind === "spend-fee-waiver",
        );
        if (altSpend !== undefined) {
          base += ` (ou ${formatBrl(altSpend.required)}/mês em gastos)`;
        }
        return base;
      }
      return "sem anuidade";
    }
    return "sem anuidade";
  }

  // Fee is > 0 — charged; show waiver routes if known.
  const reqs: ScoreLabRequirement[] = stack.scoreLab?.requirements ?? [];
  const investReq = reqs.find((r) => r.kind === "investment-fee-waiver");
  const spendReq = reqs.find((r) => r.kind === "spend-fee-waiver");

  const routes: string[] = [];
  if (investReq !== undefined) {
    routes.push(`${formatBrl(investReq.required)} investidos`);
  }
  if (spendReq !== undefined) {
    routes.push(`${formatBrl(spendReq.required)}/mês`);
  }

  if (routes.length === 0) return "cobrada";

  let line = `cobrada — isentaria com ${routes.join(" ou ")}`;
  if (spendReq !== undefined && spendReq.available > 0 && spendReq.available < spendReq.required) {
    line += `; você gasta ${formatBrl(spendReq.available)}/mês`;
  }
  return line;
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

// ─── dominant row ─────────────────────────────────────────────────────────────

const computeDominantRowKey = (rows: ComparisonRow[]): ComparisonRowKey | null => {
  let best: ComparisonRow | undefined;
  let bestDiff = 0;
  for (const row of rows) {
    if (row.key === "net") continue;
    const d = Math.abs(row.recommendedValueBrl - row.currentValueBrl);
    if (best === undefined || d > bestDiff) {
      best = row;
      bestDiff = d;
    }
  }
  if (best === undefined || bestDiff < 0.01) return null;
  return best.key;
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

const sentence1 = (key: ComparisonRowKey, currentRow: ComparisonRow): string => {
  const currentRaw = rawForProse(key, currentRow.currentValueBrl);
  const recommendedRaw = rawForProse(key, currentRow.recommendedValueBrl);
  return `A maior diferença está ${dominantFrase(key)}: ${formatBrl(currentRaw)} no atual, ${formatBrl(recommendedRaw)} no recomendado.`;
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
  domKey: ComparisonRowKey | null,
  rows: ComparisonRow[],
): string[] => {
  const s2 = sentence2VariantA(currentStack, topStack);
  if (domKey === null) return [s2];
  const domRow = rows.find((r) => r.key === domKey);
  if (domRow === undefined) return [s2];
  return [sentence1(domKey, domRow), s2];
};

const variantBNarrative = (
  currentStack: StackEvaluation,
  topStack: StackEvaluation,
  domKey: ComparisonRowKey | null,
  rows: ComparisonRow[],
): string[] => {
  const s2 = sentence2VariantB(currentStack, topStack);
  if (domKey === null) return [s2];
  const domRow = rows.find((r) => r.key === domKey);
  if (domRow === undefined) return [s2];
  return [sentence1(domKey, domRow), s2];
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
      currentSubLabel: feeSubLine(currentStack),
      recommendedSubLabel: feeSubLine(topStack),
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
  const domKey = computeDominantRowKey(rows);

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
