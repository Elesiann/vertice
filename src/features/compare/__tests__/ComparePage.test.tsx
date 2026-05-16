import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ComparePage } from "@/pages/ComparePage";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { fail, ok } from "@/lib/result";
import { useCompareStore } from "@/lib/compare-store";
import type {
  CardCatalogResponse,
  PublicCardDetail,
  Recommendation,
  RecommendationEnvelope,
  SolverError,
  SpendingProfile,
} from "@/types";

const fetchCardDetail =
  vi.fn<
    (
      id: string,
    ) => Promise<ReturnType<typeof ok<PublicCardDetail>> | ReturnType<typeof fail<SolverError>>>
  >();
const fetchCardCatalog = vi.fn<() => Promise<CardCatalogResponse>>();
const fetchRecommendation = vi.fn<() => Promise<ReturnType<typeof ok<RecommendationEnvelope>>>>();

const recommendationEnvelope = (recommendation: Recommendation): RecommendationEnvelope => ({
  recommendation,
  catalogVersion: "test",
  solverVersion: "test",
});

vi.mock("@/lib/api", () => ({
  fetchCardDetail: (id: string) => fetchCardDetail(id),
  fetchCardCatalog: () => fetchCardCatalog(),
  fetchRecommendation: () => fetchRecommendation(),
}));

const makeCard = (id: string, name: string): PublicCardDetail => ({
  id,
  name,
  bank: "nubank",
  brand: "mastercard",
  tier: "gold",
  pointsProgram: "smiles",
  annualFeeBrl: 1200,
  hasLoungeAccess: false,
  hasTravelInsurance: false,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
});

const LocationProbe = (): React.JSX.Element => {
  const location = useLocation();
  return <span data-testid="location">{location.search}</span>;
};

const Seed = ({ profile }: { profile: SpendingProfile | null }): null => {
  const { setProfile } = useSession();
  useEffect(() => {
    if (profile !== null) setProfile(profile);
  }, [profile, setProfile]);
  return null;
};

const profile: SpendingProfile = {
  monthlyDomesticBrl: 5000,
  monthlyInternationalUsd: 0,
  redemption: { kind: "any" },
};

const makeRecommendation = (
  recommendedCardId: string,
  byCardId: Record<string, number>,
): Recommendation => {
  const topStack: Recommendation["topStack"] = {
    cards: [
      {
        id: recommendedCardId,
        name: `Cartão ${recommendedCardId.toUpperCase()}`,
        bank: "nubank",
        pointsProgram: "smiles",
      },
    ],
    allocation: [
      { cardId: recommendedCardId, monthlyDomesticBrl: 5000, monthlyInternationalUsd: 0 },
    ],
    liquidity: "high",
    yearOneAnnualFeeBrl: 0,
    yearOneWelcomeBonusPoints: 0,
    yearOneEarnedPoints: 0,
    yearOneTotalPoints: 0,
    yearOneTotalValueBrl: 0,
    yearOneNetValueBrl: byCardId[recommendedCardId] ?? 0,
    warnings: [],
    confidence: "high",
  };
  return {
    topStack,
    alternatives: [],
    leaderboardsByAxis: [],
    isReturnDecisionTight: false,
    travelTranslation: { kind: "cashback", valueBrl: 0 },
    shoutout: "",
    scoreLab: {
      scenarioId: "test",
      preference: "any",
      ptaxRate: 5,
      ptaxSource: "manual",
      ptaxFetchedAt: "2026-05-09T00:00:00.000Z",
      scoreLabVersion: "test",
      evaluatedStacks: Object.keys(byCardId).length,
      netReturnLeaderDiffers: false,
      netReturnLeader: topStack,
      nearUnlocks: [],
      singleCardNetReturnByCardId: byCardId,
      notes: [],
    },
  };
};

const renderPage = (entry: string, seededProfile: SpendingProfile | null = null): void => {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <SessionProvider>
        <Seed profile={seededProfile} />
        <ComparePage />
        <LocationProbe />
      </SessionProvider>
    </MemoryRouter>,
  );
};

describe("ComparePage empty state", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCompareStore.setState({ ids: [] });
    fetchCardDetail.mockImplementation((id) => Promise.resolve(ok(makeCard(id, `Cartão ${id}`))));
    fetchRecommendation.mockResolvedValue(ok(recommendationEnvelope(makeRecommendation("r", {}))));
    fetchCardCatalog.mockResolvedValue({
      cards: [],
      catalogVersion: "test",
      count: 0,
      filters: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no ids are present", () => {
    renderPage("/compare");
    expect(screen.getByText(/Nenhum cartão para comparar/i)).toBeInTheDocument();
  });
});

describe("ComparePage no profile", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCompareStore.setState({ ids: ["a", "b"] });
    fetchCardDetail.mockImplementation((id) =>
      Promise.resolve(ok(makeCard(id, `Cartão ${id.toUpperCase()}`))),
    );
    fetchRecommendation.mockResolvedValue(ok(recommendationEnvelope(makeRecommendation("r", {}))));
    fetchCardCatalog.mockResolvedValue({
      cards: [],
      catalogVersion: "test",
      count: 0,
      filters: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows CTA button when no profile is set", async () => {
    renderPage("/compare?ids=a,b");
    expect(await screen.findByRole("link", { name: /Definir perfil/i })).toBeInTheDocument();
    await screen.findAllByText(/Cartão [AB]/);
  });
});

describe("ComparePage card fetch error", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCompareStore.setState({ ids: ["a"] });
    fetchCardDetail.mockResolvedValue(fail({ code: "NETWORK_ERROR", message: "Falha na rede" }));
    fetchRecommendation.mockResolvedValue(ok(recommendationEnvelope(makeRecommendation("r", {}))));
    fetchCardCatalog.mockResolvedValue({
      cards: [],
      catalogVersion: "test",
      count: 0,
      filters: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows error message when card fetch fails", async () => {
    renderPage("/compare?ids=a");
    expect(await screen.findByText(/Falha na rede/i)).toBeInTheDocument();
  });
});

describe("ComparePage inline add", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCompareStore.setState({ ids: [] });
    fetchCardDetail.mockImplementation((id) => Promise.resolve(ok(makeCard(id, `Cartão ${id}`))));
    fetchRecommendation.mockResolvedValue(ok(recommendationEnvelope(makeRecommendation("r", {}))));
    fetchCardCatalog.mockResolvedValue({
      cards: [makeCard("a", "Cartão a"), makeCard("b", "Cartão b"), makeCard("d", "Delta Gold")],
      catalogVersion: "test",
      count: 3,
      filters: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("adds a catalog card to URL and compare store", async () => {
    renderPage("/compare?ids=a,b");

    await screen.findAllByText("Cartão a");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar cartão" }));
    await userEvent.type(screen.getByPlaceholderText("Buscar cartão…"), "delta");
    await userEvent.click(screen.getByRole("option", { name: /Delta Gold/i }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("?ids=a%2Cb%2Cd");
    });
    expect(useCompareStore.getState().ids).toContain("d");
  });
});

describe("ComparePage remove card", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCompareStore.setState({ ids: ["a", "b", "c"] });
    fetchCardDetail.mockImplementation((id) =>
      Promise.resolve(ok(makeCard(id, `Cartão ${id.toUpperCase()}`))),
    );
    fetchRecommendation.mockResolvedValue(ok(recommendationEnvelope(makeRecommendation("r", {}))));
    fetchCardCatalog.mockResolvedValue({
      cards: [],
      catalogVersion: "test",
      count: 0,
      filters: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("removes one card from URL and compare store", async () => {
    renderPage("/compare?ids=a,b,c");

    await screen.findAllByText("Cartão B");
    await userEvent.click(screen.getByRole("button", { name: "Remover Cartão B" }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("?ids=a%2Cc");
    });
    expect(useCompareStore.getState().ids).not.toContain("b");
  });

  it("does not allow removing a card when only two cards are compared", async () => {
    renderPage("/compare?ids=a,b");

    await screen.findAllByText("Cartão A");

    expect(screen.queryByRole("button", { name: "Remover Cartão A" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remover Cartão B" })).not.toBeInTheDocument();
  });
});

describe("ComparePage recommended card add", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCompareStore.setState({ ids: ["a", "b", "c", "d"] });
    fetchCardDetail.mockImplementation((id) =>
      Promise.resolve(ok(makeCard(id, `Cartão ${id.toUpperCase()}`))),
    );
    fetchRecommendation.mockResolvedValue(
      ok(
        recommendationEnvelope(makeRecommendation("r", { a: 100, b: 50, c: 300, d: 200, r: 500 })),
      ),
    );
    fetchCardCatalog.mockResolvedValue({
      cards: [],
      catalogVersion: "test",
      count: 0,
      filters: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("adds the results recommendation and replaces the worst compared card at the 4-card limit", async () => {
    renderPage("/compare?ids=a,b,c,d", profile);

    await screen.findAllByText("Cartão A");
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Adicionar cartão recomendado e substituir o pior",
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("?ids=a%2Cc%2Cd%2Cr");
    });
    expect(useCompareStore.getState().ids).toEqual(["a", "c", "d", "r"]);
  });
});
