import { useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CompareNarrativeBanner } from "@/features/compare/CompareNarrativeBanner";
import { SessionProvider, useSession } from "@/context/SessionContext";
import type { PublicCardDetail, Recommendation, SpendingProfile } from "@/types";

const makeCard = (id: string, name: string): PublicCardDetail => ({
  id,
  name,
  bank: "nubank",
  brand: "mastercard",
  tier: "gold",
  pointsProgram: "smiles",
  annualFeeBrl: 0,
  hasLoungeAccess: false,
  hasTravelInsurance: false,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
});

const Seed = ({ profile }: { profile: SpendingProfile | null }): null => {
  const { setProfile } = useSession();
  useEffect(() => {
    if (profile !== null) setProfile(profile);
  }, [profile, setProfile]);
  return null;
};

const Wrap = ({ children, profile }: { children: ReactNode; profile: SpendingProfile | null }) => (
  <MemoryRouter>
    <SessionProvider>
      <Seed profile={profile} />
      {children}
    </SessionProvider>
  </MemoryRouter>
);

const baseStack: Recommendation["topStack"] = {
  cards: [
    {
      id: "x",
      name: "x",
      bank: "other",
      pointsProgram: "cashback",
      requiresRelationship: "open",
    },
  ],
  allocation: [{ cardId: "x", monthlyDomesticBrl: 5000, monthlyInternationalUsd: 0 }],
  liquidity: "high",
  yearOneAnnualFeeBrl: 0,
  yearOneWelcomeBonusPoints: 0,
  yearOneEarnedPoints: 0,
  yearOneTotalPoints: 0,
  yearOneTotalValueBrl: 0,
  yearOneNetValueBrl: 0,
  warnings: [],
  confidence: "high",
};

const stubFetch = (byCardId: Record<string, number>): void => {
  const recommendation: Recommendation = {
    topStack: baseStack,
    alternatives: [],
    leaderboardsByAxis: [],
    isReturnDecisionTight: false,
    travelTranslation: {
      program: "cashback",
      flight: "n/a",
      pointsRequired: 0,
      compatiblePoints: 0,
      trips: 0,
      remainingPoints: 0,
    },
    shoutout: "",
    scoreLab: {
      scenarioId: "test",
      preference: "any",
      ptaxRate: 5,
      ptaxSource: "manual",
      ptaxFetchedAt: "2026-05-09T00:00:00.000Z",
      scoreLabVersion: "test",
      evaluatedStacks: 1,
      netReturnLeaderDiffers: false,
      netReturnLeader: baseStack,
      nearUnlocks: [],
      notes: [],
      singleCardNetReturnByCardId: byCardId,
    },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            data: recommendation,
            catalogVersion: "test",
            solverVersion: "test",
          }),
      }),
    ),
  );
};

const profile: SpendingProfile = {
  monthlyDomesticBrl: 5000,
  monthlyInternationalUsd: 0,
  redemption: { kind: "any" },
};

describe("CompareNarrativeBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not render when profile is null", () => {
    stubFetch({ a: 1000, b: 500 });
    render(
      <Wrap profile={null}>
        <CompareNarrativeBanner cards={[makeCard("a", "Alpha"), makeCard("b", "Beta")]} />
      </Wrap>,
    );
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("renders 2-card narrative with leader, second, gasto and delta", async () => {
    stubFetch({ a: 1500, b: 500 });
    render(
      <Wrap profile={profile}>
        <CompareNarrativeBanner cards={[makeCard("a", "Alpha"), makeCard("b", "Beta")]} />
      </Wrap>,
    );
    const banner = await screen.findByRole("complementary");
    expect(banner).toHaveTextContent(/Pro seu gasto de R\$\s?5\.000,00\/mês/);
    expect(banner).toHaveTextContent(/Alpha rende R\$\s?1\.000,00\/ano a mais que Beta/);
  });

  it("renders 3-card narrative with second-vs-third delta", async () => {
    stubFetch({ a: 1500, b: 1000, c: 700 });
    render(
      <Wrap profile={profile}>
        <CompareNarrativeBanner
          cards={[makeCard("a", "Alpha"), makeCard("b", "Beta"), makeCard("c", "Charlie")]}
        />
      </Wrap>,
    );
    const banner = await screen.findByRole("complementary");
    expect(banner).toHaveTextContent(/Alpha rende R\$\s?500,00\/ano a mais que Beta/);
    expect(banner).toHaveTextContent(/Charlie fica R\$\s?300,00 atrás de Beta/);
  });

  it("renders 4-card narrative with third-vs-fourth delta", async () => {
    stubFetch({ a: 1500, b: 1000, c: 700, d: 200 });
    render(
      <Wrap profile={profile}>
        <CompareNarrativeBanner
          cards={[
            makeCard("a", "Alpha"),
            makeCard("b", "Beta"),
            makeCard("c", "Charlie"),
            makeCard("d", "Delta"),
          ]}
        />
      </Wrap>,
    );
    const banner = await screen.findByRole("complementary");
    expect(banner).toHaveTextContent(/Charlie fica R\$\s?300,00 atrás de Beta/);
    expect(banner).toHaveTextContent(/Delta fica R\$\s?500,00 atrás de Charlie/);
  });

  it("truncates card names longer than 30 chars", async () => {
    stubFetch({ a: 1000, b: 500 });
    const longName = "A".repeat(40);
    render(
      <Wrap profile={profile}>
        <CompareNarrativeBanner cards={[makeCard("a", longName), makeCard("b", "Beta")]} />
      </Wrap>,
    );
    const banner = await screen.findByRole("complementary");
    expect(banner.textContent).toMatch(/A{29}…/);
  });
});
