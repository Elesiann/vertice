import { describe, expect, it } from "vitest";
import { buildAlternativeLadder, buildAlternativesFullList } from "@/features/results/alternatives";
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
      "card", // c
      "card", // d (max(belowRecommendedCount, 4) = 4 below)
    ]);
  });

  it("collapses 2+ gated-above cards into an above-summary row", () => {
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
    expect(rows[0]).toMatchObject({ kind: "above-summary", count: 2 });
    expect(rows[1]).toMatchObject({ kind: "recommended" });
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
