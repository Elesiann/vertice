import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { ResultsView } from "@/features/results/ResultsView";
import type { ProgramId, Recommendation, SpendingProfile, StackEvaluation } from "@/types";

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

const makeStack = ({
  id,
  name,
  netReturnBrl,
  pointsProgram = "cashback",
  productReliabilityScore = 90,
  requiredInvestmentBrl,
}: {
  id: string;
  name: string;
  netReturnBrl: number;
  pointsProgram?: ProgramId;
  productReliabilityScore?: number;
  requiredInvestmentBrl?: number;
}): StackEvaluation => ({
  ...stack,
  cards: [
    {
      id,
      name,
      bank: "other",
      pointsProgram,
      requiresRelationship: "open",
      ...(requiredInvestmentBrl !== undefined ? { requiredInvestmentBrl } : {}),
    },
  ],
  allocation: [
    {
      cardId: id,
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
    },
  ],
  yearOneNetValueBrl: netReturnBrl,
  scoreLab: {
    ...stack.scoreLab,
    stackId: id,
    productReliabilityScore,
    modeledAnnual: {
      ...stack.scoreLab.modeledAnnual,
      netReturnBrl,
    },
    potentialAnnual: {
      ...stack.scoreLab.potentialAnnual,
      netReturnBrl,
    },
  },
});

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

const baseScoreLab: NonNullable<Recommendation["scoreLab"]> = {
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
    expect(screen.getByText(/Líquido estimado em 12 meses/i)).toBeInTheDocument();
    expect(screen.getByText(/Anuidade total/i)).toBeInTheDocument();
    expect(screen.getByText(/Custo FX\/IOF/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Nenhuma combinação do catálogo chega a R\$ 1\.500,00\/ano/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Custo internacional anual estimado em R\$ 444,00/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ver cálculo completo/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Tradução em viagens/i })).toBeInTheDocument();
    expect(screen.queryByText(/Trade-offs por eixo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Outras opções no eixo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Você está deixando na mesa/i)).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/score-lab\/recommendations$/),
      expect.any(Object),
    );
  });

  it("renders money-on-the-table hero when currentCardIds and gap exist", async () => {
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

    expect(await screen.findByText(/Você está deixando na mesa/i)).toBeInTheDocument();
    expect(screen.getByText(/256,00/)).toBeInTheDocument();
    expect(screen.queryByText(/Líquido estimado em 12 meses/i)).not.toBeInTheDocument();
  });

  it("uses recommendedNow as the displayed recommendation when the modeled leader is not actionable", async () => {
    const modeledLeader = makeStack({
      id: "recargapay-titan",
      name: "RecargaPay Titan Mastercard Black",
      netReturnBrl: 1023,
      requiredInvestmentBrl: 30000,
    });
    const recommendedNow = makeStack({
      id: "picpay-sicoob",
      name: "PicPay + Sicoob",
      netReturnBrl: 147,
    });

    mockRecommendation({
      ...recommendationFixture,
      topStack: modeledLeader,
      scoreLab: {
        ...baseScoreLab,
        netReturnLeader: modeledLeader,
        decisionTracks: {
          recommendedNow,
          actionable: recommendedNow,
          nearUnlock: null,
          stretch: null,
          conditionalUpside: modeledLeader,
          closestActionableSubstitute: {
            stack: recommendedNow,
            similarity: 0.4,
            reasons: ["mesmo objetivo de redencao"],
          },
        },
      },
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      availableToInvestBrl: 0,
      redemption: { kind: "any" },
    });

    expect(
      await screen.findByRole("heading", { level: 1, name: /PicPay \+ Sicoob/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        level: 1,
        name: /RecargaPay Titan Mastercard Black/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Maior retorno modelado: RecargaPay Titan Mastercard Black/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Tradução em viagens/i })).not.toBeInTheDocument();
  });

  it("labels the actionable fallback explicitly when recommendedNow is null", async () => {
    const modeledLeader = makeStack({
      id: "recargapay-titan",
      name: "RecargaPay Titan Mastercard Black",
      netReturnBrl: 1023,
      requiredInvestmentBrl: 30000,
    });
    const actionable = makeStack({
      id: "low-return-open-card",
      name: "Low Return Open Card",
      netReturnBrl: 30,
    });

    mockRecommendation({
      ...recommendationFixture,
      topStack: actionable,
      scoreLab: {
        ...baseScoreLab,
        netReturnLeader: modeledLeader,
        decisionTracks: {
          recommendedNow: null,
          actionable,
          nearUnlock: null,
          stretch: null,
          conditionalUpside: modeledLeader,
          closestActionableSubstitute: null,
          noRecommendationReason: "no-positive-actionable-return",
        },
      },
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      availableToInvestBrl: 0,
      redemption: { kind: "any" },
    });

    expect(await screen.findByText("Melhor acionável encontrado")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: /Low Return Open Card/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Não encontramos uma recomendação acionável com retorno positivo relevante/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Maior retorno modelado: RecargaPay Titan Mastercard Black/i),
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

    await userEvent.click(screen.getByText(/Ver cálculo completo/i));
    const investmentTerm = await screen.findByText(/Condição financeira/i);
    const investmentRow = investmentTerm.closest("div");
    expect(investmentRow).toBeInTheDocument();
    expect(investmentRow).toHaveTextContent(/isenção/);
    expect(investmentRow).toHaveTextContent(/50\.000,00/);
  });

  it("renders curated alternatives instead of axis trade-offs", async () => {
    const noBarrier = makeStack({
      id: "open-cashback-card",
      name: "Open Cashback Card",
      netReturnBrl: 700,
    });
    const institutional = makeStack({
      id: "institutional-card",
      name: "Institutional Card",
      netReturnBrl: 650,
      productReliabilityScore: 96,
      requiredInvestmentBrl: 20000,
    });
    const netLeader = makeStack({
      id: "net-leader-card",
      name: "Net Leader Card",
      netReturnBrl: 950,
      requiredInvestmentBrl: 30000,
    });
    const axisLeader = makeStack({
      id: "simple-card",
      name: "Simple Card",
      netReturnBrl: 620,
    });

    mockRecommendation({
      ...recommendationFixture,
      alternatives: [noBarrier, institutional, netLeader, axisLeader],
      leaderboardsByAxis: [
        { axisId: "net-return", title: "Maior retorno líquido", stacks: [netLeader, stack] },
        { axisId: "liquidity", title: "Melhor liquidez", stacks: [stack] },
        { axisId: "annual-fee", title: "Menor anuidade total", stacks: [stack] },
        { axisId: "simplicity", title: "Mais simples", stacks: [axisLeader, stack] },
        { axisId: "accessibility", title: "Mais acessível", stacks: [stack] },
      ],
      scoreLab: {
        ...baseScoreLab,
        netReturnLeaderDiffers: true,
        netReturnLeader: netLeader,
        institutionalAlternative: {
          stack: institutional,
          score: 80,
          netReturnBrl: institutional.yearOneNetValueBrl,
          netReturnDeltaBrl: -106,
          scoreDelta: -7,
          reason: "alternativa mais institucional com retorno próximo",
        },
      },
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "any" },
    });

    expect(await screen.findByRole("heading", { name: /Outras escolhas/i })).toBeInTheDocument();
    expect(screen.getByText("Sem barreira")).toBeInTheDocument();
    expect(screen.getByText("Institucional")).toBeInTheDocument();
    expect(screen.getByText("Maior retorno")).toBeInTheDocument();
    expect(screen.getByText("Simplicidade")).toBeInTheDocument();
    expect(screen.queryByText(/Trade-offs por eixo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Outras opções no eixo/i)).not.toBeInTheDocument();
  });

  it("shows preference divergence copy when the chosen redemption differs from the top stack", async () => {
    const smilesAlternative = makeStack({
      id: "smiles-card",
      name: "Smiles Card",
      netReturnBrl: 500,
      pointsProgram: "smiles",
    });

    mockRecommendation({
      ...recommendationFixture,
      alternatives: [smilesAlternative],
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "miles", program: "smiles" },
    });

    expect(
      await screen.findByText(
        /Você marcou milhas Smiles\. O recomendado é cashback: R\$ 756,00\/ano contra R\$ 500,00\/ano do melhor de milhas Smiles\./i,
      ),
    ).toBeInTheDocument();
  });

  it("does not repeat cashback value in travel translation", async () => {
    mockRecommendation({
      ...recommendationFixture,
      travelTranslation: {
        ...recommendationFixture.travelTranslation,
        program: "cashback",
        compatiblePoints: 756,
      },
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "cashback" },
    });

    expect(await screen.findByText(/R\$ 756,00 de cashback/i)).toBeInTheDocument();
    expect(screen.queryByText(/Valor compatível/i)).not.toBeInTheDocument();
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
