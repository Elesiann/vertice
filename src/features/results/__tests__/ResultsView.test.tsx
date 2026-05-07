import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { ResultsView } from "@/features/results/ResultsView";
import type { Recommendation, SpendingProfile } from "@/types";

const SeedSession = ({ profile }: { profile: SpendingProfile | null }): null => {
  const { setProfile } = useSession();
  useEffect(() => {
    if (profile !== null) setProfile(profile);
  }, [profile, setProfile]);
  return null;
};

const renderResults = (profile: SpendingProfile | null): void => {
  render(
    <MemoryRouter>
      <SessionProvider>
        <SeedSession profile={profile} />
        <ResultsView />
      </SessionProvider>
    </MemoryRouter>,
  );
};

const stack = {
  cards: [
    {
      id: "domestic-rewards-card",
      name: "Domestic Rewards Card",
      bank: "other",
      pointsProgram: "cashback",
      requiresRelationship: "open",
      investmentFeeWaiverBrl: 50000,
      requiredInvestmentBrl: 50000,
    },
    {
      id: "international-travel-card",
      name: "International Travel Card",
      bank: "other",
      pointsProgram: "revpoints",
      requiresRelationship: "open",
      requiredInvestmentBrl: 0,
    },
  ],
  allocation: [
    {
      cardId: "domestic-rewards-card",
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
    },
    {
      cardId: "international-travel-card",
      monthlyDomesticBrl: 0,
      monthlyInternationalUsd: 200,
    },
  ],
  liquidity: "low",
  yearOneAnnualFeeBrl: 0,
  yearOneWelcomeBonusPoints: 0,
  yearOneEarnedPoints: 37200,
  yearOneTotalPoints: 37200,
  yearOneTotalValueBrl: 756,
  yearOneNetValueBrl: 756,
  warnings: [],
  confidence: "high",
  scoreLab: {
    stackId: "domestic-rewards-card|international-travel-card",
    score: 87.39,
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
      earnedPoints: 37200,
      welcomeBonusPoints: 0,
      totalPoints: 37200,
      grossValueBrl: 1200,
      benefitUtilityBrl: 0,
      recurringAnnualFeeBrl: 0,
      internationalCostBrl: 444,
      netReturnBrl: 756,
    },
    potentialAnnual: {
      grossValueBrl: 1200,
      benefitUtilityBrl: 0,
      recurringAnnualFeeBrl: 0,
      internationalCostBrl: 444,
      netReturnBrl: 756,
      incrementalNetReturnBrl: 0,
    },
    productReliabilityScore: 90,
    requirements: [],
    foreignExchangeCosts: [],
    benefitsApplied: [],
    benefitsNotApplied: [],
    reasons: [
      "Domestic Rewards Card + International Travel Card: score 87.39 com retorno líquido anual modelado de R$ 756.00.",
      "Custo internacional modelado: R$ 444.00/ano.",
    ],
    verdict: {
      kind: "viable",
      label: "Pode compensar dependendo do uso",
      detail: "Retorno líquido modelado de R$ 756,00 ao ano.",
    },
    breakEvenMonthlySpendBrl: null,
    roiMultiple: null,
  },
} satisfies Recommendation["topStack"];

const recommendationFixture: Recommendation = {
  topStack: stack,
  alternatives: [],
  leaderboardsByAxis: [
    { axisId: "net-return", title: "Maior retorno líquido", stacks: [stack] },
    { axisId: "liquidity", title: "Melhor liquidez", stacks: [stack] },
    { axisId: "annual-fee", title: "Menor anuidade total", stacks: [stack] },
    { axisId: "simplicity", title: "Mais simples", stacks: [stack] },
    { axisId: "accessibility", title: "Mais acessível", stacks: [stack] },
  ],
  isReturnDecisionTight: false,
  travelTranslation: {
    program: "tudoazul",
    flight: "GRU-FOR economy via TudoAzul",
    pointsRequired: 14000,
    compatiblePoints: 37200,
    trips: 2,
    remainingPoints: 9200,
  },
  shoutout:
    "Com Domestic Rewards Card + International Travel Card, você gera R$ 756 de valor líquido no primeiro ano.",
  scoreLab: {
    scenarioId: "frontend-profile",
    preference: "any",
    ptaxRate: 4.95,
    ptaxSource: "manual",
    ptaxFetchedAt: "2026-05-07T13:00:00.000Z",
    scoreLabVersion: "test-score-lab",
    evaluatedStacks: 7140,
    netReturnLeaderDiffers: false,
    netReturnLeader: stack,
    nearUnlocks: [],
    notes: [],
  },
};

const mockRecommendation = (recommendation: Recommendation = recommendationFixture): void => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          data: recommendation,
          catalogVersion: "test",
          solverVersion: "test",
        }),
    }),
  );
};

describe("ResultsView", () => {
  beforeEach(() => {
    mockRecommendation();
  });

  it("shows empty state when no profile is set", () => {
    renderResults(null);

    expect(screen.getByRole("heading", { name: /Nada para mostrar ainda/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /formulário/i })).toBeInTheDocument();
  });

  it("renders the full reveal when a profile is seeded", async () => {
    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "miles", program: "smiles" },
    });

    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Auditoria score-lab/i })).toBeInTheDocument();
    expect(screen.getAllByText(/FX\/IOF/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: /Trade-offs por eixo/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Tradução em viagens/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /Comparar com stack atual/i }),
    ).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/score-lab\/recommendations$/),
      expect.any(Object),
    );
  });

  it("renders current-card comparison only when currentCardIds is informed", async () => {
    mockRecommendation({
      ...recommendationFixture,
      currentStack: {
        ...stack,
        yearOneNetValueBrl: 500,
      },
      moneyOnTheTableBrl: 256,
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "miles", program: "smiles" },
      currentCardIds: ["domestic-rewards-card"],
    });

    expect(
      await screen.findByRole("region", { name: /Comparar com stack atual/i }),
    ).toBeInTheDocument();
  });

  it("does not render contradictory accessibility copy", async () => {
    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      availableToInvestBrl: 10000,
      redemption: { kind: "any" },
    });

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText(/exige correntista.*não exige correntista/i)).not.toBeInTheDocument();
    expect(screen.getByText(/segue comparado sem bloqueio automático/i)).toBeInTheDocument();
    const investmentRow = screen.getByText(/Investimento para acesso\/isenção/i).closest("div");
    expect(investmentRow).toBeInTheDocument();
    expect(investmentRow).toHaveTextContent(/isenção/);
    expect(investmentRow).toHaveTextContent(/50\.000,00/);
  });

  it("renders an error state when the solver rejects the profile", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({
            ok: false,
            error: { code: "INVALID_PROFILE", message: "Informe pelo menos um valor positivo." },
          }),
      }),
    );

    renderResults({
      monthlyDomesticBrl: 0,
      monthlyInternationalUsd: 0,
      redemption: { kind: "any" },
    });

    expect(
      await screen.findByRole("heading", { name: /Não conseguimos recomendar/i }),
    ).toBeInTheDocument();
  });
});
