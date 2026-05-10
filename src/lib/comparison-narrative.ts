import { formatBrl } from "@/lib/format";
import type { StackEvaluation } from "@/types";

export type DiagnosisVariant = "current-negative" | "current-positive";

export type ComparisonRowKey =
  | "cashback"
  | "points"
  | "travel-benefit"
  | "annual-fee"
  | "fx-iof"
  | "net";

export interface ComparisonRow {
  key: ComparisonRowKey;
  label: string;
  currentValueBrl: number;
  recommendedValueBrl: number;
}

export interface ComparisonNarrative {
  variant: DiagnosisVariant;
  diagnosis: string[];
  rows: ComparisonRow[];
  verdictBrl: number;
}

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

const variantANarrative = (currentStack: StackEvaluation, topStack: StackEvaluation): string[] => {
  const currentFee = formatBrl(currentStack.yearOneAnnualFeeBrl);
  const currentLoss = formatBrl(Math.abs(currentStack.yearOneNetValueBrl));
  const recommendedNet = formatBrl(topStack.yearOneNetValueBrl);
  const feeClause = recommendedFeeClause(topStack);
  return [
    `No seu gasto, seu cartão atual cobra ${currentFee} de anuidade e fica negativo em ${currentLoss}/ano.`,
    `O recomendado renderia ${recommendedNet} líquido/ano ${feeClause}.`,
  ];
};

const variantBNarrative = (currentStack: StackEvaluation, topStack: StackEvaluation): string[] => {
  const currentNet = formatBrl(currentStack.yearOneNetValueBrl);
  const recommendedNet = formatBrl(topStack.yearOneNetValueBrl);
  return [
    `Seu cartão atual rende ${currentNet} líquido/ano.`,
    `O recomendado renderia ${recommendedNet} líquido/ano com seu mesmo gasto.`,
  ];
};

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
    });
  }

  const feeCurrent = currentStack.yearOneAnnualFeeBrl;
  const feeRecommended = topStack.yearOneAnnualFeeBrl;
  if (feeCurrent > 0 || feeRecommended > 0) {
    rows.push({
      key: "annual-fee",
      label: "Anuidade",
      currentValueBrl: feeCurrent > 0 ? -feeCurrent : 0,
      recommendedValueBrl: feeRecommended > 0 ? -feeRecommended : 0,
    });
  }

  const fxCurrent = fxValue(currentStack);
  const fxRecommended = fxValue(topStack);
  if (fxCurrent > 0 || fxRecommended > 0) {
    rows.push({
      key: "fx-iof",
      label: "FX/IOF",
      currentValueBrl: fxCurrent > 0 ? -fxCurrent : 0,
      recommendedValueBrl: fxRecommended > 0 ? -fxRecommended : 0,
    });
  }

  rows.push({
    key: "net",
    label: "Net anual",
    currentValueBrl: currentStack.yearOneNetValueBrl,
    recommendedValueBrl: topStack.yearOneNetValueBrl,
  });

  return rows;
};

export const buildComparisonNarrative = (
  currentStack: StackEvaluation,
  topStack: StackEvaluation,
): ComparisonNarrative => {
  const variant: DiagnosisVariant =
    currentStack.yearOneNetValueBrl <= 0 ? "current-negative" : "current-positive";
  const diagnosis =
    variant === "current-negative"
      ? variantANarrative(currentStack, topStack)
      : variantBNarrative(currentStack, topStack);
  const rows = buildRows(currentStack, topStack);
  return {
    variant,
    diagnosis,
    rows,
    verdictBrl: topStack.yearOneNetValueBrl - currentStack.yearOneNetValueBrl,
  };
};
