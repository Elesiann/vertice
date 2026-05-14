import { formatBrl } from "@/lib/format";
import type { StackEvaluation } from "@/types";

const ALTERNATIVE_PROXIMITY_BRL = 1_500;

const returnKindFor = (topStack: StackEvaluation): string => {
  const cards = topStack.cards;
  if (cards.length === 0) return "pontos + benefícios";
  const allCashback = cards.every((c) => c.pointsProgram === "cashback");
  return allCashback ? "cashback + benefícios" : "pontos + benefícios";
};

const waiverPhrase = (topStack: StackEvaluation): string | null => {
  const benefit = topStack.scoreLab?.benefitsApplied.find(
    (b) => b.kind === "annual-fee-waiver" && b.valueBrl > 0,
  );
  const requirement = benefit?.requirement;
  if (requirement === undefined) return null;
  if (requirement.kind === "spend-fee-waiver") return "com seu gasto atual";
  if (requirement.kind === "investment-fee-waiver") return "com seus investimentos atuais";
  return null;
};

export const whyWonSentences = (
  topStack: StackEvaluation,
  alternatives: StackEvaluation[],
): string[] | null => {
  const scoreLab = topStack.scoreLab;
  if (scoreLab === undefined) return null;
  if (scoreLab.verdict.kind === "negative") return null;

  const fee = topStack.yearOneAnnualFeeBrl;
  const gross = scoreLab.modeledAnnual.grossValueBrl + scoreLab.modeledAnnual.benefitUtilityBrl;
  const netReturn = topStack.yearOneNetValueBrl;

  if (netReturn <= 0) {
    return [
      `Esse cartão fica negativo no seu gasto. ${formatBrl(gross)}/ano de retorno modelado não cobre ${formatBrl(fee)}/ano de anuidade.`,
    ];
  }

  const kind = returnKindFor(topStack);
  const waiverNote = waiverPhrase(topStack);
  const annuityClause =
    waiverNote !== null
      ? `cobra ${formatBrl(fee)}/ano de anuidade ${waiverNote}`
      : `cobra ${formatBrl(fee)}/ano de anuidade`;
  const lead = `Vence porque rende ${formatBrl(gross)}/ano em ${kind} e ${annuityClause}.`;

  const closeAlternative = alternatives
    .filter((alt) => netReturn - alt.yearOneNetValueBrl <= ALTERNATIVE_PROXIMITY_BRL)
    .reduce<
      StackEvaluation | undefined
    >((best, alt) => (best === undefined || alt.yearOneNetValueBrl > best.yearOneNetValueBrl ? alt : best), undefined);

  if (closeAlternative === undefined) {
    return [lead];
  }

  const altIsHigher = closeAlternative.yearOneNetValueBrl > netReturn;
  const altSuffix = altIsHigher
    ? " mas podem exigir gastos, mensalidade ou investimentos adicionais"
    : "";
  return [
    lead,
    `As outras opções chegaram a ${formatBrl(closeAlternative.yearOneNetValueBrl)}/ano de retorno líquido${altSuffix}.`,
  ];
};
