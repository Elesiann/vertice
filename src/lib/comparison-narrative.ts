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
  label: string;
  valueBrl: number;
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
  if (bd.loungeValueBrl > 0) parts.push({ label: "Sala VIP", valueBrl: bd.loungeValueBrl });
  if (bd.insuranceValueBrl > 0) parts.push({ label: "Seguro", valueBrl: bd.insuranceValueBrl });
  if (bd.baggageValueBrl > 0) parts.push({ label: "Bagagem", valueBrl: bd.baggageValueBrl });
  return parts;
};

// ─── fee waiver sub-lines ─────────────────────────────────────────────────────
// Copy mirrors ResultsView.heroWaiverHint for the recommended side and is generic re: card names.
// "isenta/cobrada" sub-labels surfaced on the annual-fee row.

const feeWaiverSubLines = (
  currentStack: StackEvaluation,
  topStack: StackEvaluation,
): { current: string | undefined; recommended: string | undefined } => {
  // ── Recommended side: only when fee is 0
  let recommended: string | undefined;
  if (topStack.yearOneAnnualFeeBrl === 0) {
    const waiver = topStack.scoreLab?.benefitsApplied.find(
      (b) => b.kind === "annual-fee-waiver" && b.valueBrl > 0,
    );
    if (waiver !== undefined) {
      const req = waiver.requirement;
      let base: string;
      if (req?.kind === "spend-fee-waiver") {
        base = `isenta: gasto de ${formatBrl(req.required)}/mês satisfaz`;
        // the only alternative route is the other kind (investment), so no need to
        // dedupe against the trigger requirement.
        const altInvest = topStack.scoreLab?.requirements.find(
          (r: ScoreLabRequirement) => r.kind === "investment-fee-waiver",
        );
        if (altInvest !== undefined) {
          base += ` (alternativa: ${formatBrl(altInvest.required)} investidos)`;
        }
      } else if (req?.kind === "investment-fee-waiver") {
        base = `isenta: ${formatBrl(req.required)} investidos no emissor satisfazem`;
        const altSpend = topStack.scoreLab?.requirements.find(
          (r: ScoreLabRequirement) => r.kind === "spend-fee-waiver",
        );
        if (altSpend !== undefined) {
          base += ` (ou ${formatBrl(altSpend.required)}/mês em gastos)`;
        }
      } else {
        base = "sem anuidade";
      }
      recommended = base;
    } else {
      recommended = "sem anuidade";
    }
  }

  // ── Current side: only when fee > 0
  let current: string | undefined;
  if (currentStack.yearOneAnnualFeeBrl > 0) {
    // collect distinct waiver routes from requirements
    const reqs: ScoreLabRequirement[] = currentStack.scoreLab?.requirements ?? [];
    const investReq = reqs.find((r) => r.kind === "investment-fee-waiver");
    const spendReq = reqs.find((r) => r.kind === "spend-fee-waiver");

    const routes: string[] = [];
    if (investReq !== undefined) {
      routes.push(`${formatBrl(investReq.required)} investidos`);
    }
    if (spendReq !== undefined) {
      routes.push(`${formatBrl(spendReq.required)}/mês`);
    }

    if (routes.length === 0) {
      current = "cobrada";
    } else {
      let line = `cobrada; isentaria com ${routes.join(" ou ")}`;
      // partial spend note: user already spends some amount toward a spend waiver
      if (
        spendReq !== undefined &&
        spendReq.available > 0 &&
        spendReq.available < spendReq.required
      ) {
        line += ` — você gasta ${formatBrl(spendReq.available)}/mês`;
      }
      current = line;
    }
  }

  return { current, recommended };
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

// Returns the "em + artigo" contracted form so it slots into "A diferença maior está ___:".
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
  return `A diferença maior está ${dominantFrase(key)}: ${formatBrl(currentRaw)} no atual, ${formatBrl(recommendedRaw)} no recomendado.`;
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
    const subLines = feeWaiverSubLines(currentStack, topStack);
    rows.push({
      key: "annual-fee",
      label: "Anuidade",
      currentValueBrl,
      recommendedValueBrl,
      ...(subLines.current !== undefined ? { currentSubLabel: subLines.current } : {}),
      ...(subLines.recommended !== undefined ? { recommendedSubLabel: subLines.recommended } : {}),
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
