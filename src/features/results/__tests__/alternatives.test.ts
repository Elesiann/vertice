import { describe, expect, it } from "vitest";
import {
  buildAlternativeLadder,
  buildAlternativesFullList,
  transferBonusOptimisticNetBrl,
} from "@/features/results/alternatives";
import type { Recommendation, StackEvaluation } from "@/types";

// Minimal stack with only the fields the pure ladder functions read.
const makeStack = ({
  id,
  netReturnBrl,
  requiredInvestmentBrl,
}: {
  id: string;
  netReturnBrl: number;
  requiredInvestmentBrl?: number;
}): StackEvaluation =>
  ({
    cards: [
      {
        id,
        name: id,
        bank: "other",
        pointsProgram: "cashback",
        requiresRelationship: "open",
        ...(requiredInvestmentBrl !== undefined ? { requiredInvestmentBrl } : {}),
      },
    ],
    allocation: [{ cardId: id, monthlyDomesticBrl: 5000, monthlyInternationalUsd: 0 }],
    yearOneNetValueBrl: netReturnBrl,
    yearOneAnnualFeeBrl: 0,
    scoreLab: { score: netReturnBrl },
  }) as unknown as StackEvaluation;

const rec = makeStack({ id: "rec", netReturnBrl: 2848 });

describe("buildAlternativeLadder", () => {
  it("with no current card: a single gated-above card + recommended + best below", () => {
    const pool = [
      makeStack({ id: "high", netReturnBrl: 3600, requiredInvestmentBrl: 50000 }),
      makeStack({ id: "a", netReturnBrl: 2698 }),
      makeStack({ id: "b", netReturnBrl: 2313 }),
      makeStack({ id: "c", netReturnBrl: 2127 }),
      makeStack({ id: "d", netReturnBrl: 1900 }),
    ];
    const rows = buildAlternativeLadder({
      pool,
      topStack: rec,
      gapCollapseMin: 5,
      belowRecommendedCount: 3,
    });
    expect(rows.map((r) => r.kind)).toEqual([
      "card", // high (gated, above)
      "recommended",
      "card", // a
      "card", // b
      "card", // c — 1 above + 3 below = LADDER_TOTAL_CARDS (4); "d" stays on the full list
    ]);
  });

  it("drops 2+ gated-above cards from the ladder (the section blurb covers them)", () => {
    const pool = [
      makeStack({ id: "h1", netReturnBrl: 3600, requiredInvestmentBrl: 50000 }),
      makeStack({ id: "h2", netReturnBrl: 3200, requiredInvestmentBrl: 80000 }),
      makeStack({ id: "a", netReturnBrl: 2698 }),
    ];
    const rows = buildAlternativeLadder({
      pool,
      topStack: rec,
      gapCollapseMin: 5,
      belowRecommendedCount: 3,
    });
    expect(rows[0]).toMatchObject({ kind: "recommended" });
    expect(rows.map((r) => r.kind)).toEqual(["recommended", "card"]); // only "a", below
  });

  it("with a far current card: double window with a gap row carrying the hidden count", () => {
    const pool = [
      makeStack({ id: "a", netReturnBrl: 2700 }),
      makeStack({ id: "b", netReturnBrl: 2600 }),
      makeStack({ id: "c", netReturnBrl: 2500 }),
      ...Array.from({ length: 8 }, (_, i) =>
        makeStack({ id: `mid${String(i)}`, netReturnBrl: 2400 - i }),
      ),
      makeStack({ id: "near", netReturnBrl: 1910 }), // immediately above the current card
      makeStack({ id: "below", netReturnBrl: 1840 }), // immediately below the current card
    ];
    const current = makeStack({ id: "cur", netReturnBrl: 1882 });
    const rows = buildAlternativeLadder({
      pool,
      topStack: rec,
      currentStack: current,
      gapCollapseMin: 5,
      belowRecommendedCount: 3,
    });
    expect(rows.map((r) => r.kind)).toEqual([
      "recommended",
      "card", // a
      "card", // b
      "card", // c
      "gap",
      "card", // near
      "current",
      "card", // below
    ]);
    expect(rows.find((r) => r.kind === "gap")).toMatchObject({ kind: "gap", count: 8 });
    const cur = rows.find((r) => r.kind === "current");
    expect(cur).toBeDefined();
    if (cur?.kind === "current") {
      expect(cur.deltaBrl).toBeCloseTo(1882 - 2848);
      expect(cur.deltaBrl).toBeLessThan(0);
    }
  });

  it("with a near current card (gap <= gapCollapseMin): contiguous ladder, no gap row", () => {
    const pool = [
      makeStack({ id: "a", netReturnBrl: 2700 }),
      makeStack({ id: "b", netReturnBrl: 2600 }),
      makeStack({ id: "c", netReturnBrl: 2500 }),
      makeStack({ id: "near", netReturnBrl: 2400 }),
      makeStack({ id: "below", netReturnBrl: 2200 }),
    ];
    const current = makeStack({ id: "cur", netReturnBrl: 2300 });
    const rows = buildAlternativeLadder({
      pool,
      topStack: rec,
      currentStack: current,
      gapCollapseMin: 5,
      belowRecommendedCount: 3,
    });
    expect(rows.map((r) => r.kind)).not.toContain("gap");
    expect(rows.map((r) => r.kind)).toEqual([
      "recommended",
      "card", // a
      "card", // b
      "card", // c
      "card", // near
      "current",
      "card", // below
    ]);
  });

  it("anchoredOnCurrentCard: symmetric window — 2 above, anchor, 2 below", () => {
    const pool = [
      makeStack({ id: "u1", netReturnBrl: 4000, requiredInvestmentBrl: 100000 }),
      makeStack({ id: "u2", netReturnBrl: 3500, requiredInvestmentBrl: 50000 }),
      makeStack({ id: "u3", netReturnBrl: 3000, requiredInvestmentBrl: 30000 }),
      makeStack({ id: "below1", netReturnBrl: 2700 }),
      makeStack({ id: "below2", netReturnBrl: 2500 }),
      makeStack({ id: "below3", netReturnBrl: 2200 }),
    ];
    // The current card is the anchor (passed as topStack); no separate currentStack in Estado B.
    const rows = buildAlternativeLadder({
      pool,
      topStack: rec, // net 2848 — sits below u1/u2/u3, above the "below*" cards
      gapCollapseMin: 5,
      belowRecommendedCount: 3,
      anchoredOnCurrentCard: true,
    });
    // u1 (further up) is left for the full list; the window shows the two closest on each side.
    expect(rows.map((r) => r.kind)).toEqual([
      "card", // u2
      "card", // u3
      "recommended", // the current card
      "card", // below1
      "card", // below2
    ]);
    const cards = rows.filter((r) => r.kind === "card");
    expect(cards[0]).toMatchObject({ kind: "card" });
    if (cards[0]?.kind === "card") expect(cards[0].stack.yearOneNetValueBrl).toBe(3500);
  });

  it("dedupes by stackId and never duplicates the recommended into a pool row", () => {
    const dup = makeStack({ id: "rec", netReturnBrl: 2848 }); // same stackId as rec
    const rows = buildAlternativeLadder({
      pool: [dup, makeStack({ id: "a", netReturnBrl: 2000 })],
      topStack: rec,
      gapCollapseMin: 5,
      belowRecommendedCount: 3,
    });
    expect(rows.filter((r) => r.kind === "recommended")).toHaveLength(1);
    expect(rows.filter((r) => r.kind === "card")).toHaveLength(1); // only "a"
  });
});

describe("buildAlternativesFullList", () => {
  it("ranks the pool globally, marks recommended and current, dedupes", () => {
    const recommendation = {
      topStack: rec,
      currentStack: makeStack({ id: "cur", netReturnBrl: 1000 }),
      alternatives: [
        makeStack({ id: "a", netReturnBrl: 2000 }),
        makeStack({ id: "a", netReturnBrl: 2000 }), // duplicate stackId
      ],
      leaderboardsByAxis: [],
    } as unknown as Recommendation;
    const rows = buildAlternativesFullList(recommendation);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(rows[0]).toMatchObject({ isRecommended: true, rank: 1 });
    expect(rows.find((r) => r.isCurrent)).toMatchObject({ rank: 3 });
    expect(rows).toHaveLength(3);
    const cur = rows.find((r) => r.isCurrent);
    expect(cur?.deltaBrl).toBeCloseTo(1000 - 2848);
  });
});

describe("transferBonusOptimisticNetBrl", () => {
  const stackWith = (
    pointsProgram: string,
    grossValueBrl: number,
    netReturnBrl: number,
  ): StackEvaluation =>
    ({
      cards: [
        {
          id: "x",
          name: "X",
          bank: "other",
          pointsProgram,
          requiresRelationship: "open",
        },
      ],
      allocation: [{ cardId: "x", monthlyDomesticBrl: 5000, monthlyInternationalUsd: 0 }],
      yearOneNetValueBrl: netReturnBrl,
      yearOneAnnualFeeBrl: 0,
      scoreLab: { score: netReturnBrl, modeledAnnual: { grossValueBrl } },
    }) as unknown as StackEvaluation;

  it("adds a conservative bonus uplift on the gross points value for an eligible program", () => {
    // 800 net + 0.8 * 1000 gross
    expect(transferBonusOptimisticNetBrl(stackWith("livelo", 1000, 800))).toBeCloseTo(1600);
  });

  it("is null for a cashback program (fixed value, no transfer game)", () => {
    expect(transferBonusOptimisticNetBrl(stackWith("cashback", 1000, 800))).toBeNull();
  });

  it("is null for a direct airline-miles program", () => {
    expect(transferBonusOptimisticNetBrl(stackWith("smiles", 1000, 800))).toBeNull();
  });

  it("is null when the uplift is below the noise threshold", () => {
    expect(transferBonusOptimisticNetBrl(stackWith("livelo", 100, 800))).toBeNull(); // 80 < 150
  });
});
