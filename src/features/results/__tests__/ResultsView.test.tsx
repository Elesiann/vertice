import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { ResultsView } from "@/features/results/ResultsView";
import type { Bank, ProgramId, Recommendation, SpendingProfile, StackEvaluation } from "@/types";

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
  bank = "other",
  score,
}: {
  id: string;
  name: string;
  netReturnBrl: number;
  pointsProgram?: ProgramId;
  productReliabilityScore?: number;
  requiredInvestmentBrl?: number;
  bank?: Bank;
  score?: number;
}): StackEvaluation => ({
  ...stack,
  cards: [
    {
      id,
      name,
      bank,
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
    score: score ?? stack.scoreLab.score,
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
      screen.getByText(/Vence porque rende R\$ 1\.200,00\/ano em pontos/i),
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

  it("renders the comparison view (variant B) when currentCardIds is set and current net is positive", async () => {
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

    await screen.findByRole("heading", { level: 1 });

    expect(screen.queryByText(/Líquido estimado em 12 meses/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Você está deixando na mesa/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Por que venceu/i)).not.toBeInTheDocument();

    expect(screen.getByText(/Seu cartão atual rende R\$\s?500,00\/ano/)).toBeInTheDocument();
    expect(
      screen.getByText(/O recomendado renderia R\$\s?756,00\/ano com o mesmo gasto/),
    ).toBeInTheDocument();
    expect(screen.getByText("HOJE")).toBeInTheDocument();
    expect(screen.getByText("RECOMENDADO")).toBeInTheDocument();
    expect(screen.getByText("Diferença anual")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?256,00/)).toBeInTheDocument();

    expect(screen.getByText(/Sem exigência financeira de acesso/)).toBeInTheDocument();
  });

  it("renders the comparison view (variant A) when current net is non-positive", async () => {
    const currentNegative = {
      ...stack,
      yearOneAnnualFeeBrl: 1068,
      yearOneNetValueBrl: -318,
      scoreLab: {
        ...stack.scoreLab,
        modeledAnnual: {
          ...stack.scoreLab.modeledAnnual,
          recurringAnnualFeeBrl: 1068,
          netReturnBrl: -318,
          grossValueBrl: 750,
        },
      },
    };

    mockRecommendation({
      ...recommendationFixture,
      currentStack: currentNegative,
      moneyOnTheTableBrl: 1074,
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "any" },
      currentCardIds: ["domestic-rewards-card"],
    });

    await screen.findByRole("heading", { level: 1 });

    expect(
      screen.getByText(
        /A maior diferença está na anuidade: R\$\s?1\.068,00 no atual, R\$\s?0,00 no recomendado/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Seu cartão atual fica negativo em R\$\s?318,00\/ano/),
    ).toBeInTheDocument();

    expect(screen.queryByText(/Por que venceu/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Sem exigência financeira de acesso/)).toBeInTheDocument();
  });

  it("renders heroNotes (e.g. preference divergence) in comparison mode", async () => {
    const smilesAlternative = {
      ...stack,
      cards: [
        {
          id: "smiles-alt",
          name: "Smiles Alternative",
          bank: "other" as const,
          pointsProgram: "smiles" as ProgramId,
          requiresRelationship: "open" as const,
        },
      ],
      yearOneNetValueBrl: 500,
    };

    mockRecommendation({
      ...recommendationFixture,
      alternatives: [smilesAlternative],
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

    await screen.findByRole("heading", { level: 1 });

    expect(
      screen.getByText(/Você marcou milhas Smiles\. O recomendado é cashback/i),
    ).toBeInTheDocument();
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
    // expect(
    //   screen.getByText(/Maior retorno modelado: RecargaPay Titan Mastercard Black/i),
    // ).toBeInTheDocument();
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
    // expect(
    //   screen.getByText(/Maior retorno modelado: RecargaPay Titan Mastercard Black/i),
    // ).toBeInTheDocument();
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
    expect(screen.queryByText(/Para a melhor acessibilidade/i)).not.toBeInTheDocument();
    // Card has investmentFeeWaiverBrl 50k mas yearOneAnnualFeeBrl é 0 — não deve falar
    // sobre "Anuidade isenta" (a anuidade já está zerada no cenário modelado).
    expect(screen.queryByText(/Anuidade isenta/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Sem exigência financeira de acesso/i)).toBeInTheDocument();

    await userEvent.click(screen.getByText(/Ver cálculo completo/i));
    const investmentTerm = await screen.findByText(/Condição financeira/i);
    const investmentRow = investmentTerm.closest("div");
    expect(investmentRow).toBeInTheDocument();
    expect(investmentRow).toHaveTextContent(/isenção/);
    expect(investmentRow).toHaveTextContent(/50\.000,00/);
  });

  it("calls out anuidade waiver only when the modeled annual fee is non-zero", async () => {
    const cardWithFee = {
      ...stack,
      yearOneAnnualFeeBrl: 1068,
      cards: stack.cards,
    };

    mockRecommendation({
      ...recommendationFixture,
      topStack: cardWithFee,
      scoreLab: { ...baseScoreLab, netReturnLeader: cardWithFee },
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "any" },
    });

    await screen.findByRole("heading", { level: 1 });
    expect(
      screen.getByText(/Anuidade isenta com R\$ 50\.000,00 em investimentos no banco emissor/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No seu cenário, a anuidade modelada é R\$ 1\.068,00/i),
    ).toBeInTheDocument();
  });

  it("links the recommended card name to the catalog detail page", async () => {
    const singleCard = makeStack({
      id: "picpay-card-black",
      name: "PicPay Card Black",
      netReturnBrl: 720,
    });

    mockRecommendation({
      ...recommendationFixture,
      topStack: singleCard,
      scoreLab: { ...baseScoreLab, netReturnLeader: singleCard },
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
      redemption: { kind: "cashback" },
    });

    const detailLink = await screen.findByRole("link", { name: /Detalhes do cartão/i });
    expect(detailLink).toHaveAttribute("href", "/cards/picpay-card-black");
  });

  it("does not render the redundant viable verdict badge", async () => {
    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "any" },
    });

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText(/Retorno positivo/i)).not.toBeInTheDocument();
  });

  it("groups alternatives into tabs and switches between them", async () => {
    const noBarrier = makeStack({
      id: "open-cashback-card",
      name: "Open Cashback Card",
      netReturnBrl: 700,
    });
    const traditional = makeStack({
      id: "itau-card",
      name: "Itaú Personnalité Visa Infinite",
      netReturnBrl: 680,
      bank: "itau",
    });
    const cobranded = makeStack({
      id: "amazon-cobranded",
      name: "Amazon.com.br Mastercard Platinum",
      netReturnBrl: 670,
      bank: "bradesco", // emissor Bradesco mas marca Amazon
    });
    const fintech = makeStack({
      id: "nubank-card",
      name: "Nubank Ultravioleta",
      netReturnBrl: 660,
      bank: "nubank",
    });
    const netLeader = makeStack({
      id: "net-leader-card",
      name: "Net Leader Card",
      netReturnBrl: 950,
      requiredInvestmentBrl: 30000,
    });

    mockRecommendation({
      ...recommendationFixture,
      alternatives: [noBarrier, traditional, cobranded, fintech, netLeader],
      leaderboardsByAxis: [
        { axisId: "net-return", title: "Maior retorno líquido", stacks: [netLeader, stack] },
        { axisId: "liquidity", title: "Melhor liquidez", stacks: [stack] },
        { axisId: "annual-fee", title: "Menor anuidade total", stacks: [stack] },
        { axisId: "simplicity", title: "Mais simples", stacks: [stack] },
        { axisId: "accessibility", title: "Mais acessível", stacks: [stack] },
      ],
      scoreLab: {
        ...baseScoreLab,
        netReturnLeaderDiffers: true,
        netReturnLeader: netLeader,
      },
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "any" },
    });

    expect(await screen.findByRole("heading", { name: /Outras escolhas/i })).toBeInTheDocument();

    const menorBarreiraTab = screen.getByRole("tab", { name: /Menor barreira/i });
    const tradicionalTab = screen.getByRole("tab", { name: /Tradicional/i });
    const fintechTab = screen.getByRole("tab", { name: /Fintech/i });
    const maiorRetornoTab = screen.getByRole("tab", { name: /Maior retorno/i });

    expect(menorBarreiraTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: "Open Cashback Card" })).toBeInTheDocument();
    expect(screen.queryByText(/Institucional/i)).not.toBeInTheDocument();

    await userEvent.click(tradicionalTab);
    expect(tradicionalTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("link", { name: "Itaú Personnalité Visa Infinite" }),
    ).toBeInTheDocument();
    // Cobranded com nome "Amazon" não é tradicional mesmo emitido por Bradesco
    expect(
      screen.queryByRole("link", { name: "Amazon.com.br Mastercard Platinum" }),
    ).not.toBeInTheDocument();

    await userEvent.click(fintechTab);
    expect(fintechTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: "Nubank Ultravioleta" })).toBeInTheDocument();
    // Cobranded cai aqui
    expect(
      screen.getByRole("link", { name: "Amazon.com.br Mastercard Platinum" }),
    ).toBeInTheDocument();

    await userEvent.click(maiorRetornoTab);
    expect(maiorRetornoTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: "Net Leader Card" })).toBeInTheDocument();
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

  it("hides the travel translation section for cashback recommendations", async () => {
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

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("region", { name: /Tradução em viagens/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Isso vira/i)).not.toBeInTheDocument();
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

  it("shows the 'Mais semelhantes' tab ordered by score proximity", async () => {
    // topStack has scoreLab.score = 87.39
    // near: distance 1.39, mid: distance 7.39, far: distance 27.39
    // Low netReturnBrl ensures they'd be filtered out of threshold-gated tabs (756 - 100 > 1500 threshold floor).
    const near = makeStack({ id: "near", name: "Near Card", netReturnBrl: 100, score: 86 });
    const mid = makeStack({ id: "mid", name: "Mid Card", netReturnBrl: 100, score: 80 });
    const far = makeStack({ id: "far", name: "Far Card", netReturnBrl: 100, score: 60 });

    mockRecommendation({
      ...recommendationFixture,
      alternatives: [near, mid, far],
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "any" },
    });

    await screen.findByRole("heading", { level: 1 });

    await userEvent.click(screen.getByRole("tab", { name: /Mais semelhantes/i }));

    const nearLink = screen.getByRole("link", { name: /Near Card/ });
    const farLink = screen.getByRole("link", { name: /Far Card/ });

    // Near Card appears before Far Card in DOM order
    expect(
      nearLink.compareDocumentPosition(farLink) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // Near Card (closest, rank #1) shows 100% compatível
    expect(screen.getByText(/100% compatível/)).toBeInTheDocument();

    // Raw scores are never rendered
    expect(screen.queryByText(/87[,.]39/)).toBeNull();
    expect(screen.queryByText(/86(?:[,.]0+)?(?!\s*%)/)).toBeNull();
    expect(screen.queryByText(/60(?:[,.]0+)?(?!\s*%)/)).toBeNull();
  });

  it("excludes alternatives without a scoreLab from the 'Mais semelhantes' tab", async () => {
    const scored = makeStack({ id: "scored", name: "Scored Card", netReturnBrl: 100, score: 86 });
    const { scoreLab: _omit, ...unscored } = makeStack({
      id: "unscored",
      name: "Unscored Card",
      netReturnBrl: 700,
    });

    mockRecommendation({
      ...recommendationFixture,
      alternatives: [scored, unscored],
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "any" },
    });

    await screen.findByRole("heading", { level: 1 });
    await userEvent.click(screen.getByRole("tab", { name: /Mais semelhantes/i }));

    expect(screen.getByRole("link", { name: /Scored Card/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Unscored Card/ })).toBeNull();
  });
});
