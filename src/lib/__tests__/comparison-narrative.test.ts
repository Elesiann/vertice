import { describe, expect, it } from "vitest";
import { buildComparisonNarrative } from "@/lib/comparison-narrative";
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
}

const makeStack = (overrides: MakeStackOptions = {}): StackEvaluation => {
  const {
    netReturnBrl = 0,
    annualFeeBrl = 0,
    grossValueBrl = 0,
    benefitUtilityBrl = 0,
    internationalCostBrl = 0,
    pointsProgram = "cashback",
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
    allocation: [{ cardId: "x", monthlyDomesticBrl: 5000, monthlyInternationalUsd: 0 }],
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
      },
      potentialAnnual: {
        ...baseScoreLab.potentialAnnual,
        grossValueBrl,
        benefitUtilityBrl,
        recurringAnnualFeeBrl: annualFeeBrl,
        internationalCostBrl,
        netReturnBrl,
      },
    },
  };
};

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
    it("states current annual fee, negative balance, and recommended without annual fee", () => {
      const current = makeStack({
        netReturnBrl: -318,
        annualFeeBrl: 1068,
        grossValueBrl: 750,
      });
      const top = makeStack({ netReturnBrl: 720, annualFeeBrl: 0, grossValueBrl: 720 });
      const out = buildComparisonNarrative(current, top);
      expect(out.diagnosis).toHaveLength(2);
      expect(out.diagnosis[0]).toMatch(
        /No seu gasto, seu cartão atual cobra R\$\s?1\.068,00 de anuidade e fica negativo em R\$\s?318,00\/ano\./,
      );
      expect(out.diagnosis[1]).toMatch(
        /O recomendado renderia R\$\s?720,00 líquido\/ano sem anuidade\./,
      );
    });

    it("mentions recommended annual fee when topStack has one", () => {
      const current = makeStack({ netReturnBrl: -200, annualFeeBrl: 800 });
      const top = makeStack({ netReturnBrl: 600, annualFeeBrl: 300 });
      const out = buildComparisonNarrative(current, top);
      expect(out.diagnosis[1]).toMatch(
        /O recomendado renderia R\$\s?600,00 líquido\/ano com R\$\s?300,00 de anuidade\./,
      );
    });
  });

  describe("diagnosis variant B (current-positive)", () => {
    it("states both nets without antithesis", () => {
      const current = makeStack({ netReturnBrl: 500 });
      const top = makeStack({ netReturnBrl: 720 });
      const out = buildComparisonNarrative(current, top);
      expect(out.diagnosis).toHaveLength(2);
      expect(out.diagnosis[0]).toMatch(/Seu cartão atual rende R\$\s?500,00 líquido\/ano\./);
      expect(out.diagnosis[1]).toMatch(
        /O recomendado renderia R\$\s?720,00 líquido\/ano com seu mesmo gasto\./,
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
      expect(net?.label).toBe("Net anual");
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
});
