import { formatBrl } from "@/lib/format";
import type { StackEvaluation } from "@/types";

const ALTERNATIVE_PROXIMITY_BRL = 1_500;

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

  const lead = `Vence porque rende ${formatBrl(gross)}/ano em pontos + benefícios e cobra ${formatBrl(fee)}/ano de anuidade.`;

  const closeAlternative = alternatives
    .filter((alt) => netReturn - alt.yearOneNetValueBrl <= ALTERNATIVE_PROXIMITY_BRL)
    .sort((a, b) => b.yearOneNetValueBrl - a.yearOneNetValueBrl)[0];

  if (closeAlternative === undefined) {
    return [lead];
  }

  return [
    lead,
    `As outras opções chegaram a ${formatBrl(closeAlternative.yearOneNetValueBrl)}/ano de retorno líquido.`,
  ];
};
