import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
    kind: "redemption",
    from: "GRU",
    fromLabel: "São Paulo",
    to: "FOR",
    toLabel: "Fortaleza",
    region: "domestic",
    cabin: "economy",
    roundTrip: true,
    programId: "tudoazul",
    pointsCost: 14000,
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
    expect(screen.getByRole("region", { name: /Como chegamos ao líquido/i })).toBeInTheDocument();
    expect(screen.getByText(/Líquido em 12 meses/i)).toBeInTheDocument();
    expect(screen.getByTestId("travel-hero-teaser")).toBeInTheDocument();
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

    // the annual difference moved to the hero
    expect(screen.getAllByText(/\+R\$\s?256,00/).length).toBeGreaterThanOrEqual(1);
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
      screen.getAllByText("A maior diferença está em anuidade.").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\+R\$\s?1\.074,00/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the preference panel inside the comparison view", async () => {
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

    const panel = screen.getByRole("region", {
      name: "Sobre sua preferência por milhas Smiles",
    });
    expect(
      within(panel).getByText(/O recomendado rende em cashback, não milhas Smiles puro/),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Smiles Alternative")).toBeInTheDocument();
    expect(within(panel).getByText(/melhor milhas Smiles acionável/)).toBeInTheDocument();
    expect(within(panel).getByText(/R\$\s?500,00\/ano/)).toBeInTheDocument();
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
    const maiorRetornoTab = screen.getByRole("tab", { name: /Maior retorno/i });
    // "Fintech", "Tradicional" and "Mais semelhantes" were folded away.
    expect(screen.queryByRole("tab", { name: /Fintech/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Tradicional/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Mais semelhantes/i })).not.toBeInTheDocument();

    // "Maior retorno" is the default tab.
    expect(maiorRetornoTab).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText(/Institucional/i)).not.toBeInTheDocument();
    // The recommended card is pinned as the ladder's anchor row.
    expect(screen.getByText(/recomendado · maior líquido sem barreira/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lista completa/i })).toBeInTheDocument();
    // Net Leader outranks the recommended (higher net value): it sits above the anchor.
    expect(screen.getByRole("link", { name: "Net Leader Card" })).toBeInTheDocument();
    // Cobranded falls into the unfiltered ladder.
    expect(
      screen.getByRole("link", { name: "Amazon.com.br Mastercard Platinum" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Cashback Card" })).toBeInTheDocument();

    await userEvent.click(menorBarreiraTab);
    expect(menorBarreiraTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: "Open Cashback Card" })).toBeInTheDocument();
  });

  // Gated cashback stack — an investment minimum the test profile can't meet.
  const gatedCashback = (
    id: string,
    name: string,
    netReturnBrl: number,
    minInvestmentBrl: number,
  ): StackEvaluation => ({
    ...makeStack({ id, name, netReturnBrl }),
    cards: [
      {
        id,
        name,
        bank: "other",
        pointsProgram: "cashback",
        requiresRelationship: "open",
        minInvestmentBrl,
      },
    ],
  });

  it("case 2 — names the best actionable preferred-currency card when it's below the recommendation", async () => {
    mockRecommendation({
      ...recommendationFixture,
      alternatives: [
        makeStack({
          id: "smiles-card",
          name: "Smiles Card",
          netReturnBrl: 500,
          pointsProgram: "smiles",
        }),
      ],
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "miles", program: "smiles" },
    });

    const panel = await screen.findByRole("region", {
      name: "Sobre sua preferência por milhas Smiles",
    });
    expect(within(panel).getByText("Smiles Card")).toBeInTheDocument();
    expect(within(panel).getByText(/melhor milhas Smiles acionável/)).toBeInTheDocument();
    expect(within(panel).getByText(/Sem barreira de acesso/)).toBeInTheDocument();
    expect(within(panel).getByText(/R\$\s?500,00\/ano/)).toBeInTheDocument();
  });

  it("case 1 — no preferred-currency card among the alternatives at all", async () => {
    mockRecommendation({ ...recommendationFixture, alternatives: [] });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "miles", program: "smiles" },
    });

    expect(await screen.findByText("Sobre sua preferência por milhas Smiles")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Nenhum cartão de milhas Smiles chega a R\$\s?1\.500,00\/ano do retorno dele/,
      ),
    ).toBeInTheDocument();
  });

  it("case 3 — panel lists the actionable card, the gated higher one, and the recommended", async () => {
    mockRecommendation({
      ...recommendationFixture,
      topStack: makeStack({
        id: "miles-top",
        name: "Miles Top",
        netReturnBrl: 2846,
        pointsProgram: "smiles",
      }),
      alternatives: [
        gatedCashback("gated-cb", "Gated Cashback", 4000, 50000),
        makeStack({ id: "cheap-cb", name: "Cheap Cashback", netReturnBrl: 500 }),
      ],
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
      availableToInvestBrl: 0,
      redemption: { kind: "cashback" },
    });

    const panel = await screen.findByRole("region", {
      name: "Sobre sua preferência por cashback",
    });
    expect(
      within(panel).getByText(/O recomendado rende em milhas Smiles, não cashback puro/),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Cheap Cashback")).toBeInTheDocument();
    expect(within(panel).getByText(/melhor cashback acionável/)).toBeInTheDocument();
    expect(within(panel).getByText("Gated Cashback")).toBeInTheDocument();
    expect(within(panel).getByText(/cashback maior/)).toBeInTheDocument();
    expect(
      within(panel).getByText(/Exige R\$\s?50\.000,00 investidos no emissor/),
    ).toBeInTheDocument();
    expect(within(panel).getByText(/R\$\s?4\.000,00\/ano/)).toBeInTheDocument();
    expect(within(panel).getByText("Miles Top")).toBeInTheDocument();
  });

  it("case 4 — panel shows a reachable preferred-currency card that matches or beats the recommendation", async () => {
    mockRecommendation({
      ...recommendationFixture,
      topStack: makeStack({
        id: "miles-top",
        name: "Miles Top",
        netReturnBrl: 2000,
        pointsProgram: "smiles",
      }),
      alternatives: [makeStack({ id: "big-cb", name: "Big Cashback", netReturnBrl: 3000 })],
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
      redemption: { kind: "cashback" },
    });

    const panel = await screen.findByRole("region", {
      name: "Sobre sua preferência por cashback",
    });
    expect(within(panel).getByText("Big Cashback")).toBeInTheDocument();
    expect(within(panel).getByText(/melhor cashback acionável/)).toBeInTheDocument();
    expect(within(panel).getByText(/R\$\s?3\.000,00\/ano/)).toBeInTheDocument();
  });

  it("case 5 — every preferred-currency card sits behind an investment gate", async () => {
    mockRecommendation({
      ...recommendationFixture,
      topStack: makeStack({
        id: "miles-top",
        name: "Miles Top",
        netReturnBrl: 2846,
        pointsProgram: "smiles",
      }),
      alternatives: [
        gatedCashback("gated-a", "Gated A", 4000, 50000),
        gatedCashback("gated-b", "Gated B", 3000, 30000),
      ],
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
      availableToInvestBrl: 0,
      redemption: { kind: "cashback" },
    });

    const panel = await screen.findByRole("region", {
      name: "Sobre sua preferência por cashback",
    });
    expect(within(panel).getByText("Gated A")).toBeInTheDocument();
    expect(within(panel).getByText(/cashback maior/)).toBeInTheDocument();
    expect(
      within(panel).getByText(/Exige R\$\s?50\.000,00 investidos no emissor/),
    ).toBeInTheDocument();
    expect(within(panel).getByText(/R\$\s?4\.000,00\/ano/)).toBeInTheDocument();
  });

  it("shows no hero teaser for cashback recommendations", async () => {
    mockRecommendation({
      ...recommendationFixture,
      travelTranslation: { kind: "cashback", valueBrl: 756 },
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "cashback" },
    });

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByTestId("travel-hero-teaser")).not.toBeInTheDocument();
  });

  it("shows a hero teaser with route, trip type and leftover points for a redemption", async () => {
    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "miles", program: "smiles" },
    });

    await screen.findByRole("heading", { level: 1 });
    const teaser = screen.getByTestId("travel-hero-teaser");
    expect(teaser).toHaveTextContent(/2 passagens ida e volta São Paulo → Fortaleza/i);
    expect(teaser).toHaveTextContent(/Pontos compatíveis: 37\.200/);
    expect(teaser).toHaveTextContent(/sobra 9\.200 pontos/);
  });

  it("shows the transfer line in the hero teaser when the redemption is reached via transfer", async () => {
    mockRecommendation({
      ...recommendationFixture,
      travelTranslation: {
        kind: "redemption",
        from: "GRU",
        fromLabel: "São Paulo",
        to: "FOR",
        toLabel: "Fortaleza",
        region: "domestic",
        cabin: "economy",
        roundTrip: true,
        programId: "tudoazul",
        viaProgram: "smiles",
        pointsCost: 14000,
        compatiblePoints: 37200,
        trips: 2,
        remainingPoints: 9200,
      },
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "miles", program: "smiles" },
    });

    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByTestId("travel-hero-teaser")).toHaveTextContent(
      /Transferindo 1:1 para Smiles/i,
    );
  });

  it("shows no hero teaser for a value travel translation", async () => {
    mockRecommendation({
      ...recommendationFixture,
      travelTranslation: { kind: "value", program: "smiles", compatiblePoints: 100, valueBrl: 2.5 },
    });

    renderResults({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemption: { kind: "miles", program: "smiles" },
    });

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByTestId("travel-hero-teaser")).not.toBeInTheDocument();
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
