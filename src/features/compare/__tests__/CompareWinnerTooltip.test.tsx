import { useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CompareTable } from "@/features/compare/CompareTable";
import { SessionProvider, useSession } from "@/context/SessionContext";
import type { PublicCardDetail, Recommendation, SpendingProfile } from "@/types";

const baseCard = (
  id: string,
  name: string,
  overrides: Partial<PublicCardDetail> = {},
): PublicCardDetail => ({
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
  ...overrides,
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

const stubFetch = (byCardId: Record<string, number> = {}): void => {
  const recommendation: Recommendation = {
    topStack: baseStack,
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

describe("CompareWinnerTooltip integration in CompareTable", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows tooltip with delta on the lowest-fee winner cell", () => {
    stubFetch();
    render(
      <Wrap profile={null}>
        <CompareTable
          cards={[
            baseCard("a", "Alpha", { annualFeeBrl: 600 }),
            baseCard("b", "Beta", { annualFeeBrl: 1200 }),
          ]}
        />
      </Wrap>,
    );
    const tooltips = screen.getAllByRole("tooltip");
    const feeTooltip = tooltips.find((t) =>
      /R\$\s?600,00\/ano\. R\$\s?600,00 a menos que segundo/.test(t.textContent),
    );
    expect(feeTooltip).toBeDefined();
  });

  it("shows cashback tooltip with profile-aware annual amount", async () => {
    stubFetch();
    render(
      <Wrap
        profile={{
          monthlyDomesticBrl: 5000,
          monthlyInternationalUsd: 0,
          redemption: { kind: "any" },
        }}
      >
        <CompareTable
          cards={[
            baseCard("a", "Alpha", { cashbackRatePercent: 0.02 }),
            baseCard("b", "Beta", { cashbackRatePercent: 0.01 }),
          ]}
        />
      </Wrap>,
    );
    const tooltips = await screen.findAllByRole("tooltip");
    const cashbackTooltip = tooltips.find((t) =>
      /2,00% em cashback = R\$\s?1\.200,00\/ano em valor/.test(t.textContent),
    );
    expect(cashbackTooltip).toBeDefined();
  });

  it("shows cashback tooltip with rates only when no profile is set", () => {
    stubFetch();
    render(
      <Wrap profile={null}>
        <CompareTable
          cards={[
            baseCard("a", "Alpha", { cashbackRatePercent: 0.03 }),
            baseCard("b", "Beta", { cashbackRatePercent: 0.01 }),
          ]}
        />
      </Wrap>,
    );
    const tooltips = screen.getAllByRole("tooltip");
    const found = tooltips.find((t) => t.textContent.includes("3,00%. Segundo: 1,00%"));
    expect(found).toBeDefined();
  });

  it("shows lounge tooltip with visits/year and second-place value", () => {
    stubFetch();
    render(
      <Wrap profile={null}>
        <CompareTable
          cards={[
            baseCard("a", "Alpha", {
              hasLoungeAccess: true,
              loungeAccess: { visitsPerYear: 6, providers: [] },
            }),
            baseCard("b", "Beta", {
              hasLoungeAccess: true,
              loungeAccess: { visitsPerYear: 2, providers: [] },
            }),
          ]}
        />
      </Wrap>,
    );
    const tooltips = screen.getAllByRole("tooltip");
    const found = tooltips.find((t) => t.textContent.includes("6/ano. Segundo: 2/ano"));
    expect(found).toBeDefined();
  });

  it("shows lounge ilimitado tooltip with second-place fallback", () => {
    stubFetch();
    render(
      <Wrap profile={null}>
        <CompareTable
          cards={[
            baseCard("a", "Alpha", {
              hasLoungeAccess: true,
              loungeAccess: { unlimited: true, providers: [] },
            }),
            baseCard("b", "Beta", {
              hasLoungeAccess: true,
              loungeAccess: { visitsPerYear: 4, providers: [] },
            }),
          ]}
        />
      </Wrap>,
    );
    const tooltips = screen.getAllByRole("tooltip");
    const found = tooltips.find((t) => t.textContent.includes("Ilimitado. Segundo: 4/ano"));
    expect(found).toBeDefined();
  });

  it("shows modeled-return tooltip when winner is in K2 row", async () => {
    stubFetch({ a: 1500, b: 700 });
    render(
      <Wrap
        profile={{
          monthlyDomesticBrl: 5000,
          monthlyInternationalUsd: 0,
          redemption: { kind: "any" },
        }}
      >
        <CompareTable cards={[baseCard("a", "Alpha"), baseCard("b", "Beta")]} />
      </Wrap>,
    );
    const tooltips = await screen.findAllByRole("tooltip");
    const found = tooltips.find((t) =>
      /R\$\s?1\.500,00\/ano modelado\. R\$\s?800,00 a mais que segundo/.test(t.textContent),
    );
    expect(found).toBeDefined();
  });

  it("works with edge case of only 2 cards", () => {
    stubFetch();
    render(
      <Wrap profile={null}>
        <CompareTable
          cards={[
            baseCard("a", "Alpha", { annualFeeBrl: 100 }),
            baseCard("b", "Beta", { annualFeeBrl: 500 }),
          ]}
        />
      </Wrap>,
    );
    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips.length).toBeGreaterThan(0);
  });
});
