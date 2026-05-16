import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { AlternativesPage } from "@/pages/AlternativesPage";
import type { Recommendation, SpendingProfile, StackEvaluation } from "@/types";

const makeStack = (id: string, netReturnBrl: number): StackEvaluation =>
  ({
    cards: [
      {
        id,
        name: id,
        bank: "other",
        pointsProgram: "cashback",
        requiresRelationship: "open",
      },
    ],
    allocation: [{ cardId: id, monthlyDomesticBrl: 5000, monthlyInternationalUsd: 0 }],
    yearOneNetValueBrl: netReturnBrl,
    yearOneAnnualFeeBrl: 0,
    liquidity: "high",
    scoreLab: { score: netReturnBrl },
  }) as unknown as StackEvaluation;

const recommendationFixture = {
  topStack: makeStack("Recommended Card", 3000),
  alternatives: [makeStack("Second Card", 2400), makeStack("Third Card", 1800)],
  leaderboardsByAxis: [],
  moneyOnTheTableBrl: 0,
  travelTranslation: { kind: "cashback", valueBrl: 3000 },
} as unknown as Recommendation;

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

const SeedSession = ({ profile }: { profile: SpendingProfile | null }): null => {
  const { setProfile } = useSession();
  useEffect(() => {
    if (profile !== null) setProfile(profile);
  }, [profile, setProfile]);
  return null;
};

const renderPage = (profile: SpendingProfile | null): void => {
  render(
    <MemoryRouter>
      <SessionProvider>
        <SeedSession profile={profile} />
        <AlternativesPage />
      </SessionProvider>
    </MemoryRouter>,
  );
};

describe("AlternativesPage", () => {
  beforeEach(() => {
    mockRecommendation();
  });

  it("shows the empty state when no profile is set", () => {
    renderPage(null);
    expect(screen.getByText(/Preencha seus dados/i)).toBeInTheDocument();
  });

  it("shows the loading state when recommendation is null", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise(() => {
          /* never resolves */
        }),
      ),
    );
    renderPage({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
      redemption: { kind: "any" },
    });
    expect(screen.getByText("Calculando…")).toBeInTheDocument();
  });

  it("shows the error state when recommendation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: false,
            error: { code: "SOLVER_ERROR", message: "Solver quebrou" },
          }),
      }),
    );
    renderPage({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
      redemption: { kind: "any" },
    });
    expect(await screen.findByText("Solver quebrou")).toBeInTheDocument();
    expect(screen.getByText(/Não conseguimos recomendar/i)).toBeInTheDocument();
  });

  it("renders the ranked list with the recommended card pinned at rank 1", async () => {
    renderPage({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
      redemption: { kind: "any" },
    });

    expect(await screen.findByRole("heading", { name: /Catálogo comparado/i })).toBeInTheDocument();
    expect(screen.getByText(/recomendado · maior líquido sem barreira/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Recommended Card" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Second Card" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Voltar para a recomendação/i })).toBeInTheDocument();
  });

  it("filters by lowest-barrier tab", async () => {
    renderPage({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
      redemption: { kind: "any" },
    });

    expect(await screen.findByRole("heading", { name: /Catálogo comparado/i })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Menor barreira" }));
    expect(screen.getByRole("tab", { name: "Menor barreira" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
