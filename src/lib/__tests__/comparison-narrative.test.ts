import { describe, expect, it } from "vitest";
import { buildComparisonNarrative } from "@/lib/comparison-narrative";
import type {
  ScoreLabStack,
  ScoreLabRequirement,
  ScoreLabBenefit,
  BenefitBreakdown,
  ScoreLabVerdict,
  StackEvaluation,
} from "@/types";

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
    grossValueBrl: 0,
    benefitUtilityBrl: 0,
    recurringAnnualFeeBrl: 0,
    internationalCostBrl: 0,
    netReturnBrl: 0,
  },
  potentialAnnual: {
    grossValueBrl: 0,
    benefitUtilityBrl: 0,
    recurringAnnualFeeBrl: 0,
    internationalCostBrl: 0,
    netReturnBrl: 0,
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

interface MakeStackOptions {
  netReturnBrl?: number;
  annualFeeBrl?: number;
  grossValueBrl?: number;
  benefitUtilityBrl?: number;
  internationalCostBrl?: number;
  pointsProgram?: "cashback" | "smiles" | "latam-pass";
  requirements?: ScoreLabRequirement[];
  benefitsApplied?: ScoreLabBenefit[];
  benefitsNotApplied?: ScoreLabBenefit[];
  benefitBreakdown?: BenefitBreakdown;
  breakEvenMonthlySpendBrl?: number | null;
  roiMultiple?: number | null;
  verdict?: ScoreLabVerdict;
  monthlyDomesticBrl?: number;
  monthlyInternationalUsd?: number;
}

const makeStack = (overrides: MakeStackOptions = {}): StackEvaluation => {
  const {
    netReturnBrl = 0,
    annualFeeBrl = 0,
    grossValueBrl = 0,
    benefitUtilityBrl = 0,
    internationalCostBrl = 0,
    pointsProgram = "cashback",
    requirements,
    benefitsApplied,
    benefitsNotApplied,
    benefitBreakdown,
    breakEvenMonthlySpendBrl = null,
    roiMultiple = null,
    verdict,
    monthlyDomesticBrl = 5000,
    monthlyInternationalUsd = 0,
  } = overrides;
  return {
    cards: [
      {
        id: "x",
        name: "x",
        bank: "other",
        pointsProgram,
        requiresRelationship: "open",
      },
    ],
    allocation: [{ cardId: "x", monthlyDomesticBrl, monthlyInternationalUsd }],
    liquidity: "high",
    yearOneAnnualFeeBrl: annualFeeBrl,
    yearOneWelcomeBonusPoints: 0,
    yearOneEarnedPoints: 0,
    yearOneTotalPoints: 0,
    yearOneTotalValueBrl: grossValueBrl,
    yearOneNetValueBrl: netReturnBrl,
    warnings: [],
    confidence: "high",
    scoreLab: {
      ...baseScoreLab,
      modeledAnnual: {
        ...baseScoreLab.modeledAnnual,
        grossValueBrl,
        benefitUtilityBrl,
        recurringAnnualFeeBrl: annualFeeBrl,
        internationalCostBrl,
        netReturnBrl,
        ...(benefitBreakdown !== undefined ? { benefitBreakdown } : {}),
      },
      potentialAnnual: {
        ...baseScoreLab.potentialAnnual,
        grossValueBrl,
        benefitUtilityBrl,
        recurringAnnualFeeBrl: annualFeeBrl,
        internationalCostBrl,
        netReturnBrl,
        ...(benefitBreakdown !== undefined ? { benefitBreakdown } : {}),
      },
      requirements: requirements ?? baseScoreLab.requirements,
      benefitsApplied: benefitsApplied ?? baseScoreLab.benefitsApplied,
      benefitsNotApplied: benefitsNotApplied ?? baseScoreLab.benefitsNotApplied,
      verdict: verdict ?? baseScoreLab.verdict,
      breakEvenMonthlySpendBrl,
      roiMultiple,
    },
  };
};

// Live data fixtures matching spec examples
const liveCurrentStack = makeStack({
  netReturnBrl: -318,
  annualFeeBrl: 1068,
  grossValueBrl: 750,
  pointsProgram: "cashback",
  requirements: [
    {
      cardId: "nubank-ultravioleta",
      kind: "investment-fee-waiver",
      label: "Isenção de anuidade por investimento de R$ 50000",
      required: 50000,
      available: 0,
      gap: 50000,
      unit: "BRL",
      satisfied: false,
      fit: 0,
    },
    {
      cardId: "nubank-ultravioleta",
      kind: "spend-fee-waiver",
      label: "Isenção de anuidade com gasto de R$ 8000/mês",
      required: 8000,
      available: 5000,
      gap: 3000,
      unit: "BRL/month",
      satisfied: false,
      fit: 0.63,
    },
  ],
  benefitsApplied: [],
  benefitsNotApplied: [
    {
      cardId: "nubank-ultravioleta",
      kind: "annual-fee-waiver",
      label: "Isenção de anuidade por investimento de R$ 50000",
      valueBrl: 1068,
      requirement: {
        cardId: "nubank-ultravioleta",
        kind: "investment-fee-waiver",
        label: "Isenção de anuidade por investimento de R$ 50000",
        required: 50000,
        available: 0,
        gap: 50000,
        unit: "BRL",
        satisfied: false,
        fit: 0,
      },
    },
  ],
  verdict: {
    kind: "negative",
    label: "Atenção: tende a custar mais que retorna",
    detail: "Retorno líquido modelado de R$ -318,00 ao ano.",
  },
  breakEvenMonthlySpendBrl: null,
  roiMultiple: null,
});

const liveTopStack = makeStack({
  netReturnBrl: 720,
  annualFeeBrl: 0,
  grossValueBrl: 720,
  pointsProgram: "cashback",
  monthlyDomesticBrl: 5000,
  monthlyInternationalUsd: 0,
  requirements: [
    {
      cardId: "picpay-mastercard-black",
      kind: "investment-fee-waiver",
      label: "Isenção de anuidade por investimento de R$ 50000",
      required: 50000,
      available: 0,
      gap: 50000,
      unit: "BRL",
      satisfied: false,
      fit: 0,
    },
    {
      cardId: "picpay-mastercard-black",
      kind: "spend-fee-waiver",
      label: "Isenção de anuidade com gasto de R$ 5000/mês",
      required: 5000,
      available: 5000,
      gap: 0,
      unit: "BRL/month",
      satisfied: true,
      fit: 1,
    },
  ],
  benefitsApplied: [
    {
      cardId: "picpay-mastercard-black",
      kind: "annual-fee-waiver",
      label: "Isenção de anuidade com gasto de R$ 5000/mês",
      valueBrl: 1068,
      requirement: {
        cardId: "picpay-mastercard-black",
        kind: "spend-fee-waiver",
        label: "Isenção de anuidade com gasto de R$ 5000/mês",
        required: 5000,
        available: 5000,
        gap: 0,
        unit: "BRL/month",
        satisfied: true,
        fit: 1,
      },
    },
  ],
  benefitsNotApplied: [],
  verdict: {
    kind: "viable",
    label: "Pode compensar dependendo do uso",
    detail: "Retorno líquido modelado de R$ 720,00 ao ano.",
  },
  breakEvenMonthlySpendBrl: null,
  roiMultiple: null,
});

describe("buildComparisonNarrative", () => {
  describe("verdictBrl", () => {
    it("equals topStack.net minus currentStack.net", () => {
      const current = makeStack({ netReturnBrl: -318 });
      const top = makeStack({ netReturnBrl: 720 });
      const out = buildComparisonNarrative(current, top);
      expect(out.verdictBrl).toBe(1038);
    });

    it("can be a small positive when both stacks are positive", () => {
      const current = makeStack({ netReturnBrl: 500 });
      const top = makeStack({ netReturnBrl: 756 });
      const out = buildComparisonNarrative(current, top);
      expect(out.verdictBrl).toBe(256);
    });
  });

  describe("variant detection", () => {
    it("returns current-negative when currentStack net <= 0", () => {
      const out = buildComparisonNarrative(
        makeStack({ netReturnBrl: -318 }),
        makeStack({ netReturnBrl: 720 }),
      );
      expect(out.variant).toBe("current-negative");
    });

    it("returns current-positive when currentStack net > 0", () => {
      const out = buildComparisonNarrative(
        makeStack({ netReturnBrl: 500 }),
        makeStack({ netReturnBrl: 720 }),
      );
      expect(out.variant).toBe("current-positive");
    });
  });

  describe("diagnosis variant A (current-negative)", () => {
    it("names dominant delta then states negative balance and recommended without annual fee", () => {
      const current = makeStack({
        netReturnBrl: -318,
        annualFeeBrl: 1068,
        grossValueBrl: 750,
      });
      const top = makeStack({ netReturnBrl: 720, annualFeeBrl: 0, grossValueBrl: 720 });
      const out = buildComparisonNarrative(current, top);
      // dominant delta sentence (annual-fee dominates here: |0 - (-1068)| = 1068 > |720 - 750| = 30)
      expect(out.diagnosis[0]).toMatch(
        /A maior diferença está na anuidade: R\$\s?1\.068,00 no atual, R\$\s?0,00 no recomendado\./,
      );
      // summary sentence
      expect(out.diagnosis[1]).toMatch(
        /Seu cartão atual fica negativo em R\$\s?318,00\/ano\. O recomendado renderia R\$\s?720,00 líquido\/ano sem anuidade\./,
      );
    });

    it("mentions recommended annual fee when topStack has one", () => {
      const current = makeStack({ netReturnBrl: -200, annualFeeBrl: 800 });
      const top = makeStack({ netReturnBrl: 600, annualFeeBrl: 300 });
      const out = buildComparisonNarrative(current, top);
      expect(out.diagnosis[out.diagnosis.length - 1]).toMatch(
        /O recomendado renderia R\$\s?600,00 líquido\/ano com R\$\s?300,00 de anuidade\./,
      );
    });

    it("omits dominant-delta sentence when dominantRowKey is null", () => {
      // only a net row, no other rows → dominantRowKey = null
      const current = makeStack({ netReturnBrl: -100 });
      const top = makeStack({ netReturnBrl: 200 });
      const out = buildComparisonNarrative(current, top);
      expect(out.diagnosis).toHaveLength(1);
      expect(out.diagnosis[0]).toMatch(
        /Seu cartão atual fica negativo em R\$\s?100,00\/ano\. O recomendado renderia R\$\s?200,00 líquido\/ano sem anuidade\./,
      );
    });
  });

  describe("diagnosis variant B (current-positive)", () => {
    it("names dominant delta then states both nets", () => {
      const current = makeStack({
        netReturnBrl: 500,
        grossValueBrl: 500,
        pointsProgram: "cashback",
      });
      const top = makeStack({
        netReturnBrl: 720,
        grossValueBrl: 720,
        pointsProgram: "cashback",
      });
      const out = buildComparisonNarrative(current, top);
      // cashback row dominates (|720 - 500| = 220)
      expect(out.diagnosis[0]).toMatch(
        /A maior diferença está no cashback: R\$\s?500,00 no atual, R\$\s?720,00 no recomendado\./,
      );
      expect(out.diagnosis[1]).toMatch(
        /Seu cartão atual rende R\$\s?500,00\/ano\. O recomendado renderia R\$\s?720,00\/ano com o mesmo gasto\./,
      );
    });

    it("omits dominant-delta sentence when dominantRowKey is null", () => {
      const current = makeStack({ netReturnBrl: 500 });
      const top = makeStack({ netReturnBrl: 720 });
      const out = buildComparisonNarrative(current, top);
      expect(out.diagnosis).toHaveLength(1);
      expect(out.diagnosis[0]).toMatch(
        /Seu cartão atual rende R\$\s?500,00\/ano\. O recomendado renderia R\$\s?720,00\/ano com o mesmo gasto\./,
      );
    });
  });

  describe("rows", () => {
    it("always includes the net row with both signed values", () => {
      const out = buildComparisonNarrative(
        makeStack({ netReturnBrl: -318 }),
        makeStack({ netReturnBrl: 720 }),
      );
      const net = out.rows.find((r) => r.key === "net");
      expect(net).toBeDefined();
      expect(net?.label).toBe("Líquido anual");
      expect(net?.currentValueBrl).toBe(-318);
      expect(net?.recommendedValueBrl).toBe(720);
    });

    it("includes a cashback row when either side has cashback gross > 0", () => {
      const current = makeStack({ pointsProgram: "cashback", grossValueBrl: 750 });
      const top = makeStack({ pointsProgram: "cashback", grossValueBrl: 720 });
      const out = buildComparisonNarrative(current, top);
      const cashback = out.rows.find((r) => r.key === "cashback");
      expect(cashback).toBeDefined();
      expect(cashback?.currentValueBrl).toBe(750);
      expect(cashback?.recommendedValueBrl).toBe(720);
      expect(out.rows.find((r) => r.key === "points")).toBeUndefined();
    });

    it("includes a points row when either side is a non-cashback program with gross > 0", () => {
      const current = makeStack({ pointsProgram: "smiles", grossValueBrl: 1200 });
      const top = makeStack({ pointsProgram: "smiles", grossValueBrl: 1500 });
      const out = buildComparisonNarrative(current, top);
      const points = out.rows.find((r) => r.key === "points");
      expect(points).toBeDefined();
      expect(points?.label).toBe("Pontos/milhas");
      expect(points?.currentValueBrl).toBe(1200);
      expect(points?.recommendedValueBrl).toBe(1500);
      expect(out.rows.find((r) => r.key === "cashback")).toBeUndefined();
    });

    it("includes a travel-benefit row when either side has benefitUtility > 0", () => {
      const current = makeStack({ benefitUtilityBrl: 0 });
      const top = makeStack({ benefitUtilityBrl: 200 });
      const out = buildComparisonNarrative(current, top);
      const travel = out.rows.find((r) => r.key === "travel-benefit");
      expect(travel).toBeDefined();
      expect(travel?.currentValueBrl).toBe(0);
      expect(travel?.recommendedValueBrl).toBe(200);
    });

    it("includes an annual-fee row with negative signs when either side has fee > 0", () => {
      const current = makeStack({ annualFeeBrl: 1068 });
      const top = makeStack({ annualFeeBrl: 0 });
      const out = buildComparisonNarrative(current, top);
      const fee = out.rows.find((r) => r.key === "annual-fee");
      expect(fee).toBeDefined();
      expect(fee?.currentValueBrl).toBe(-1068);
      expect(fee?.recommendedValueBrl).toBe(0);
    });

    it("includes an fx-iof row with negative signs when either side has internationalCost > 0", () => {
      const current = makeStack({ internationalCostBrl: 0 });
      const top = makeStack({ internationalCostBrl: 444 });
      const out = buildComparisonNarrative(current, top);
      const fx = out.rows.find((r) => r.key === "fx-iof");
      expect(fx).toBeDefined();
      expect(fx?.currentValueBrl).toBe(0);
      expect(fx?.recommendedValueBrl).toBe(-444);
    });

    it("omits cashback, points, travel-benefit, annual-fee and fx-iof when both sides are 0", () => {
      const current = makeStack({ netReturnBrl: 0 });
      const top = makeStack({ netReturnBrl: 100 });
      const out = buildComparisonNarrative(current, top);
      expect(out.rows.map((r) => r.key)).toEqual(["net"]);
    });

    it("orders rows: cashback/points, travel-benefit, annual-fee, fx-iof, net", () => {
      const current = makeStack({
        pointsProgram: "cashback",
        grossValueBrl: 750,
        benefitUtilityBrl: 100,
        annualFeeBrl: 1068,
        internationalCostBrl: 50,
        netReturnBrl: -268,
      });
      const top = makeStack({
        pointsProgram: "cashback",
        grossValueBrl: 720,
        benefitUtilityBrl: 0,
        annualFeeBrl: 0,
        internationalCostBrl: 0,
        netReturnBrl: 720,
      });
      const out = buildComparisonNarrative(current, top);
      expect(out.rows.map((r) => r.key)).toEqual([
        "cashback",
        "travel-benefit",
        "annual-fee",
        "fx-iof",
        "net",
      ]);
    });

    it("emits both cashback and points rows when current and recommended use different programs", () => {
      const current = makeStack({ pointsProgram: "cashback", grossValueBrl: 750 });
      const top = makeStack({ pointsProgram: "smiles", grossValueBrl: 1500 });
      const out = buildComparisonNarrative(current, top);

      const cashback = out.rows.find((r) => r.key === "cashback");
      const points = out.rows.find((r) => r.key === "points");

      expect(cashback).toBeDefined();
      expect(cashback?.currentValueBrl).toBe(750);
      expect(cashback?.recommendedValueBrl).toBe(0);

      expect(points).toBeDefined();
      expect(points?.currentValueBrl).toBe(0);
      expect(points?.recommendedValueBrl).toBe(1500);
    });
  });

  describe("row tone", () => {
    it("marks recommended-better when recommended > current", () => {
      const current = makeStack({ pointsProgram: "cashback", grossValueBrl: 500 });
      const top = makeStack({ pointsProgram: "cashback", grossValueBrl: 720 });
      const out = buildComparisonNarrative(current, top);
      const cashback = out.rows.find((r) => r.key === "cashback");
      expect(cashback?.tone).toBe("recommended-better");
    });

    it("marks current-better when current > recommended", () => {
      const current = makeStack({ pointsProgram: "cashback", grossValueBrl: 900 });
      const top = makeStack({ pointsProgram: "cashback", grossValueBrl: 720 });
      const out = buildComparisonNarrative(current, top);
      const cashback = out.rows.find((r) => r.key === "cashback");
      expect(cashback?.tone).toBe("current-better");
    });

    it("marks tie when difference < 0.01", () => {
      const current = makeStack({ pointsProgram: "cashback", grossValueBrl: 720 });
      const top = makeStack({ pointsProgram: "cashback", grossValueBrl: 720 });
      const out = buildComparisonNarrative(current, top);
      const cashback = out.rows.find((r) => r.key === "cashback");
      expect(cashback?.tone).toBe("tie");
    });

    it("marks fee row as recommended-better when current has fee and recommended does not", () => {
      // recommended has -0 (no fee), current has -1068 → recommended value higher → recommended-better
      const current = makeStack({ annualFeeBrl: 1068 });
      const top = makeStack({ annualFeeBrl: 0 });
      const out = buildComparisonNarrative(current, top);
      const fee = out.rows.find((r) => r.key === "annual-fee");
      expect(fee?.tone).toBe("recommended-better");
    });

    it("net row has no tone", () => {
      const out = buildComparisonNarrative(
        makeStack({ netReturnBrl: -318 }),
        makeStack({ netReturnBrl: 720 }),
      );
      const net = out.rows.find((r) => r.key === "net");
      expect(net?.tone).toBeUndefined();
    });
  });

  describe("dominant row", () => {
    it("returns null when only net row exists", () => {
      const out = buildComparisonNarrative(
        makeStack({ netReturnBrl: 100 }),
        makeStack({ netReturnBrl: 200 }),
      );
      expect(out.dominantRowKey).toBeNull();
    });

    it("returns null when all non-net rows have |diff| < 0.01", () => {
      const current = makeStack({ pointsProgram: "cashback", grossValueBrl: 720 });
      const top = makeStack({ pointsProgram: "cashback", grossValueBrl: 720 });
      const out = buildComparisonNarrative(current, top);
      expect(out.dominantRowKey).toBeNull();
    });

    it("returns cashback when cashback delta is largest", () => {
      // cashback diff = |720 - 500| = 220; no fee or other rows
      const current = makeStack({
        pointsProgram: "cashback",
        grossValueBrl: 500,
        netReturnBrl: 500,
      });
      const top = makeStack({
        pointsProgram: "cashback",
        grossValueBrl: 720,
        netReturnBrl: 720,
      });
      const out = buildComparisonNarrative(current, top);
      expect(out.dominantRowKey).toBe("cashback");
    });

    it("returns annual-fee when fee delta is largest", () => {
      // fee diff = |0 - (-1068)| = 1068 >> cashback diff = |720 - 750| = 30
      const current = makeStack({
        pointsProgram: "cashback",
        grossValueBrl: 750,
        annualFeeBrl: 1068,
        netReturnBrl: -318,
      });
      const top = makeStack({
        pointsProgram: "cashback",
        grossValueBrl: 720,
        annualFeeBrl: 0,
        netReturnBrl: 720,
      });
      const out = buildComparisonNarrative(current, top);
      expect(out.dominantRowKey).toBe("annual-fee");
    });

    it("tie-breaks on first row in ordering (deterministic)", () => {
      // cashback diff = 500 exactly; fee diff = 500 exactly → first row (cashback) wins
      const current = makeStack({
        pointsProgram: "cashback",
        grossValueBrl: 500,
        annualFeeBrl: 500,
        netReturnBrl: 0,
      });
      const top = makeStack({
        pointsProgram: "cashback",
        grossValueBrl: 1000,
        annualFeeBrl: 0,
        netReturnBrl: 1000,
      });
      const out = buildComparisonNarrative(current, top);
      expect(out.dominantRowKey).toBe("cashback");
    });
  });

  describe("fee waiver sub-lines", () => {
    it("recommended sub-label: spend waiver satisfied + investment alternative", () => {
      const out = buildComparisonNarrative(liveCurrentStack, liveTopStack);
      const feeRow = out.rows.find((r) => r.key === "annual-fee");
      // Should not appear because top has fee = 0 but current has fee = 1068, so row exists
      expect(feeRow).toBeDefined();
      expect(feeRow?.recommendedSubLabel).toMatch(/isenta/);
      expect(feeRow?.recommendedSubLabel).toMatch(/R\$\s?5\.000,00/);
      expect(feeRow?.recommendedSubLabel).toMatch(/alternativa/);
      expect(feeRow?.recommendedSubLabel).toMatch(/R\$\s?50\.000,00/);
    });

    it("recommended sub-label: undefined when top has fee > 0", () => {
      const top = makeStack({ annualFeeBrl: 300, netReturnBrl: 300 });
      const out = buildComparisonNarrative(liveCurrentStack, top);
      const feeRow = out.rows.find((r) => r.key === "annual-fee");
      expect(feeRow?.recommendedSubLabel).toBeUndefined();
    });

    it("recommended sub-label: sem anuidade fallback when fee=0 and no benefitsApplied waiver", () => {
      const top = makeStack({
        annualFeeBrl: 0,
        netReturnBrl: 720,
        grossValueBrl: 720,
        // no benefitsApplied waiver
        benefitsApplied: [],
      });
      const out = buildComparisonNarrative(liveCurrentStack, top);
      const feeRow = out.rows.find((r) => r.key === "annual-fee");
      expect(feeRow?.recommendedSubLabel).toBe("sem anuidade");
    });

    it("current sub-label: cobrada with both investment and spend routes + partial spend note", () => {
      const out = buildComparisonNarrative(liveCurrentStack, liveTopStack);
      const feeRow = out.rows.find((r) => r.key === "annual-fee");
      expect(feeRow?.currentSubLabel).toMatch(/cobrada/);
      expect(feeRow?.currentSubLabel).toMatch(/R\$\s?50\.000,00/);
      expect(feeRow?.currentSubLabel).toMatch(/R\$\s?8\.000,00/);
      // partial spend: available=5000, required=8000 → "você gasta R$ 5.000,00/mês"
      expect(feeRow?.currentSubLabel).toMatch(/você gasta/);
      expect(feeRow?.currentSubLabel).toMatch(/R\$\s?5\.000,00\/mês/);
    });

    it("current sub-label: cobrada only when no routes exist", () => {
      const current = makeStack({
        annualFeeBrl: 500,
        netReturnBrl: -500,
        requirements: [],
        benefitsNotApplied: [],
      });
      const top = makeStack({ netReturnBrl: 200 });
      const out = buildComparisonNarrative(current, top);
      const feeRow = out.rows.find((r) => r.key === "annual-fee");
      expect(feeRow?.currentSubLabel).toBe("cobrada");
    });

    it("current sub-label: undefined when current has no fee", () => {
      const current = makeStack({ annualFeeBrl: 0, netReturnBrl: 500 });
      const top = makeStack({ annualFeeBrl: 300, netReturnBrl: 300 });
      const out = buildComparisonNarrative(current, top);
      const feeRow = out.rows.find((r) => r.key === "annual-fee");
      expect(feeRow?.currentSubLabel).toBeUndefined();
    });

    it("investment-fee-waiver only route on recommended side", () => {
      const top = makeStack({
        annualFeeBrl: 0,
        netReturnBrl: 720,
        grossValueBrl: 720,
        benefitsApplied: [
          {
            cardId: "x",
            kind: "annual-fee-waiver",
            label: "Isenção por investimento",
            valueBrl: 500,
            requirement: {
              cardId: "x",
              kind: "investment-fee-waiver",
              label: "Isenção de anuidade por investimento",
              required: 50000,
              available: 50000,
              gap: 0,
              unit: "BRL",
              satisfied: true,
              fit: 1,
            },
          },
        ],
        requirements: [
          {
            cardId: "x",
            kind: "investment-fee-waiver",
            label: "Isenção de anuidade por investimento",
            required: 50000,
            available: 50000,
            gap: 0,
            unit: "BRL",
            satisfied: true,
            fit: 1,
          },
        ],
      });
      const out = buildComparisonNarrative(liveCurrentStack, top);
      const feeRow = out.rows.find((r) => r.key === "annual-fee");
      expect(feeRow?.recommendedSubLabel).toMatch(/isenta/);
      expect(feeRow?.recommendedSubLabel).toMatch(/R\$\s?50\.000,00/);
      expect(feeRow?.recommendedSubLabel).toMatch(/no emissor/);
    });
  });

  describe("benefit breakdown parts", () => {
    it("returns empty array when no benefitBreakdown", () => {
      const out = buildComparisonNarrative(liveCurrentStack, liveTopStack);
      // neither live stack has travel-benefit row (benefitUtility = 0), so travel row absent
      expect(out.rows.find((r) => r.key === "travel-benefit")).toBeUndefined();
    });

    it("attaches breakdown parts with only >0 components to travel-benefit row", () => {
      const breakdown: BenefitBreakdown = {
        loungeValueBrl: 2400,
        insuranceValueBrl: 1750,
        baggageValueBrl: 0,
        totalBrl: 4150,
      };
      const current = makeStack({ benefitUtilityBrl: 0 });
      const top = makeStack({
        benefitUtilityBrl: 4150,
        benefitBreakdown: breakdown,
      });
      const out = buildComparisonNarrative(current, top);
      const travel = out.rows.find((r) => r.key === "travel-benefit");
      expect(travel).toBeDefined();

      const recBreakdown = travel?.recommendedBreakdown ?? [];
      expect(recBreakdown).toHaveLength(2);
      expect(recBreakdown[0]).toEqual({ label: "Sala VIP", valueBrl: 2400 });
      expect(recBreakdown[1]).toEqual({ label: "Seguro", valueBrl: 1750 });

      const curBreakdown = travel?.currentBreakdown ?? [];
      expect(curBreakdown).toEqual([]);
    });

    it("attaches all three components when all > 0", () => {
      const breakdown: BenefitBreakdown = {
        loungeValueBrl: 2400,
        insuranceValueBrl: 1750,
        baggageValueBrl: 600,
        totalBrl: 4750,
      };
      const top = makeStack({
        benefitUtilityBrl: 4750,
        benefitBreakdown: breakdown,
      });
      const out = buildComparisonNarrative(makeStack({ benefitUtilityBrl: 0 }), top);
      const travel = out.rows.find((r) => r.key === "travel-benefit");
      const recBreakdown = travel?.recommendedBreakdown ?? [];
      expect(recBreakdown).toHaveLength(3);
      expect(recBreakdown.map((p) => p.label)).toEqual(["Sala VIP", "Seguro", "Bagagem"]);
    });
  });

  describe("verdict passthrough", () => {
    it("returns currentVerdict from scoreLab.verdict", () => {
      const out = buildComparisonNarrative(liveCurrentStack, liveTopStack);
      expect(out.currentVerdict).toBeDefined();
      expect(out.currentVerdict?.kind).toBe("negative");
      expect(out.currentVerdict?.label).toBe("Atenção: tende a custar mais que retorna");
    });

    it("returns recommendedVerdict from scoreLab.verdict", () => {
      const out = buildComparisonNarrative(liveCurrentStack, liveTopStack);
      expect(out.recommendedVerdict).toBeDefined();
      expect(out.recommendedVerdict?.kind).toBe("viable");
      expect(out.recommendedVerdict?.label).toBe("Pode compensar dependendo do uso");
    });

    it("returns undefined when no scoreLab", () => {
      const noScoreLab: StackEvaluation = {
        cards: [
          {
            id: "x",
            name: "x",
            bank: "other",
            pointsProgram: "cashback",
          },
        ],
        allocation: [],
        liquidity: "high",
        yearOneAnnualFeeBrl: 0,
        yearOneWelcomeBonusPoints: 0,
        yearOneEarnedPoints: 0,
        yearOneTotalPoints: 0,
        yearOneTotalValueBrl: 500,
        yearOneNetValueBrl: 500,
        warnings: [],
        confidence: "high",
        // scoreLab deliberately absent
      };
      const out = buildComparisonNarrative(noScoreLab, noScoreLab);
      expect(out.currentVerdict).toBeUndefined();
      expect(out.recommendedVerdict).toBeUndefined();
    });
  });

  describe("spend metadata and break-even/ROI", () => {
    it("passes monthlySpendBrl from topStack.allocation[0]", () => {
      const top = makeStack({ monthlyDomesticBrl: 7500, monthlyInternationalUsd: 200 });
      const out = buildComparisonNarrative(makeStack(), top);
      expect(out.monthlySpendBrl).toBe(7500);
      expect(out.monthlyInternationalUsd).toBe(200);
    });

    it("defaults to 0 when allocation is empty", () => {
      const noAlloc: StackEvaluation = {
        ...makeStack(),
        allocation: [],
      };
      const out = buildComparisonNarrative(makeStack(), noAlloc);
      expect(out.monthlySpendBrl).toBe(0);
      expect(out.monthlyInternationalUsd).toBe(0);
    });

    it("passes currentBreakEvenMonthlySpendBrl from currentStack.scoreLab", () => {
      const current = makeStack({ breakEvenMonthlySpendBrl: 7120 });
      const out = buildComparisonNarrative(current, makeStack());
      expect(out.currentBreakEvenMonthlySpendBrl).toBe(7120);
    });

    it("passes null when breakEvenMonthlySpendBrl is null", () => {
      const out = buildComparisonNarrative(liveCurrentStack, liveTopStack);
      expect(out.currentBreakEvenMonthlySpendBrl).toBeNull();
    });

    it("passes currentRoiMultiple from currentStack.scoreLab", () => {
      const current = makeStack({ roiMultiple: 3.59 });
      const out = buildComparisonNarrative(current, makeStack());
      expect(out.currentRoiMultiple).toBe(3.59);
    });

    it("passes null when roiMultiple is null", () => {
      const out = buildComparisonNarrative(liveCurrentStack, liveTopStack);
      expect(out.currentRoiMultiple).toBeNull();
    });
  });
});
