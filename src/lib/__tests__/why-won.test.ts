import { describe, expect, it } from "vitest";
import { whyWonSentences } from "@/lib/why-won";
import type { ScoreLabStack, StackEvaluation } from "@/types";

const baseScoreLab: ScoreLabStack = {
  stackId: "x",
  score: 80,
  scoreBreakdown: {
    economicReturnCurrent: { raw: 100, weight: 30, weighted: 30 },
    conditionFit: { raw: 100, weight: 25, weighted: 25 },
    costSafety: { raw: 90, weight: 15, weighted: 13.5 },
    objectiveAlignment: { raw: 100, weight: 15, weighted: 15 },
    allocationEfficiency: { raw: 80, weight: 5, weighted: 4 },
    productReliability: { raw: 90, weight: 5, weighted: 4.5 },
    dataConfidence: { raw: 82, weight: 5, weighted: 4.1 },
  },
  modeledAnnual: {
    earnedPoints: 0,
    welcomeBonusPoints: 0,
    totalPoints: 0,
    grossValueBrl: 1000,
    benefitUtilityBrl: 200,
    recurringAnnualFeeBrl: 400,
    internationalCostBrl: 0,
    netReturnBrl: 800,
  },
  potentialAnnual: {
    grossValueBrl: 1000,
    benefitUtilityBrl: 200,
    recurringAnnualFeeBrl: 400,
    internationalCostBrl: 0,
    netReturnBrl: 800,
    incrementalNetReturnBrl: 0,
  },
  productReliabilityScore: 90,
  requirements: [],
  foreignExchangeCosts: [],
  benefitsApplied: [],
  benefitsNotApplied: [],
  reasons: [],
  verdict: { kind: "viable", label: "Pode compensar", detail: "" },
  breakEvenMonthlySpendBrl: null,
  roiMultiple: null,
};

interface MakeStackOptions extends Partial<Omit<StackEvaluation, "scoreLab">> {
  scoreLabOverrides?: {
    modeledAnnual?: Partial<ScoreLabStack["modeledAnnual"]>;
    verdict?: Partial<ScoreLabStack["verdict"]>;
  };
}

const makeStack = (overrides: MakeStackOptions = {}): StackEvaluation => {
  const { scoreLabOverrides, ...rest } = overrides;
  const scoreLab: ScoreLabStack = {
    ...baseScoreLab,
    modeledAnnual: { ...baseScoreLab.modeledAnnual, ...scoreLabOverrides?.modeledAnnual },
    verdict: { ...baseScoreLab.verdict, ...scoreLabOverrides?.verdict },
  };
  return {
    cards: [
      {
        id: "x",
        name: "x",
        bank: "other",
        pointsProgram: "cashback",
        requiresRelationship: "open",
      },
    ],
    allocation: [{ cardId: "x", monthlyDomesticBrl: 5000, monthlyInternationalUsd: 0 }],
    liquidity: "high",
    yearOneAnnualFeeBrl: 400,
    yearOneWelcomeBonusPoints: 0,
    yearOneEarnedPoints: 0,
    yearOneTotalPoints: 0,
    yearOneTotalValueBrl: 0,
    yearOneNetValueBrl: 800,
    warnings: [],
    confidence: "high",
    scoreLab,
    ...rest,
  };
};

describe("whyWonSentences", () => {
  it("returns null when verdict is negative", () => {
    const top = makeStack({
      scoreLabOverrides: { verdict: { kind: "negative" } },
    });
    expect(whyWonSentences(top, [])).toBeNull();
  });

  it("returns just the lead sentence when no close alternatives exist", () => {
    const top = makeStack();
    const out = whyWonSentences(top, []);
    expect(out).not.toBeNull();
    expect(out).toHaveLength(1);
    expect(out?.[0]).toMatch(/Vence porque rende R\$\s?1\.200,00\/ano/);
    expect(out?.[0]).toMatch(/cobra R\$\s?400,00\/ano de anuidade/);
  });

  it("includes alternatives sentence when one is within R$ 1.500/ano", () => {
    const top = makeStack();
    const close = makeStack({ yearOneNetValueBrl: 700 });
    const out = whyWonSentences(top, [close]);
    expect(out).toHaveLength(2);
    expect(out?.[1]).toMatch(/As outras opções chegaram a R\$\s?700,00\/ano/);
  });

  it("omits alternatives sentence when the gap is wider than R$ 1.500/ano", () => {
    const top = makeStack({ yearOneNetValueBrl: 3000 });
    const far = makeStack({ yearOneNetValueBrl: 800 });
    const out = whyWonSentences(top, [far]);
    expect(out).toHaveLength(1);
  });

  it("uses the negative-scenario sentence when netReturn is non-positive", () => {
    const top = makeStack({
      yearOneNetValueBrl: -200,
      scoreLabOverrides: {
        modeledAnnual: { netReturnBrl: -200 },
        verdict: { kind: "viable" },
      },
    });
    const out = whyWonSentences(top, []);
    expect(out).toHaveLength(1);
    expect(out?.[0]).toMatch(/Esse cartão fica negativo/);
    expect(out?.[0]).toMatch(/R\$\s?1\.200,00\/ano de retorno modelado/);
    expect(out?.[0]).toMatch(/não cobre R\$\s?400,00\/ano de anuidade/);
  });
});
