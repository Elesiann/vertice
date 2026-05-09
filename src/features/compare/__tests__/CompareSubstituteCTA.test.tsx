import { useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CompareSubstituteCTA } from "@/features/compare/CompareSubstituteCTA";
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

const Wrap = ({
  children,
  profile,
  initialEntries = ["/compare"],
}: {
  children: ReactNode;
  profile: SpendingProfile | null;
  initialEntries?: string[];
}) => (
  <MemoryRouter initialEntries={initialEntries}>
    <SessionProvider>
      <Seed profile={profile} />
      <Routes>
        <Route path="/compare" element={<>{children}</>} />
        <Route path="/results" element={<div>results page</div>} />
      </Routes>
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

const stubFetch = (byCardId: Record<string, number>, externalCard?: PublicCardDetail): void => {
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
    vi.fn((url: string) => {
      if (url.includes("/score-lab/recommendations")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ok: true,
              data: recommendation,
              catalogVersion: "test",
              solverVersion: "test",
            }),
        });
      }
      if (url.includes("/cards/") && externalCard !== undefined) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(externalCard),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }),
  );
};

describe("CompareSubstituteCTA", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not render when profile has no currentCardIds", () => {
    stubFetch({ a: 500, b: 1500 });
    render(
      <Wrap
        profile={{
          monthlyDomesticBrl: 5000,
          monthlyInternationalUsd: 0,
          redemption: { kind: "any" },
        }}
      >
        <CompareSubstituteCTA cards={[makeCard("a", "Alpha"), makeCard("b", "Beta")]} />
      </Wrap>,
    );
    expect(screen.queryByText(/Substituir/i)).not.toBeInTheDocument();
  });

  it("does not render when current card already leads", async () => {
    stubFetch({ a: 1500, b: 500 });
    render(
      <Wrap
        profile={{
          monthlyDomesticBrl: 5000,
          monthlyInternationalUsd: 0,
          redemption: { kind: "any" },
          currentCardIds: ["a"],
        }}
      >
        <CompareSubstituteCTA cards={[makeCard("a", "Alpha"), makeCard("b", "Beta")]} />
      </Wrap>,
    );
    // Wait a tick for fetch to settle
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByText(/Substituir/i)).not.toBeInTheDocument();
  });

  it("renders CTA with delta when leader beats current (current in comparator)", async () => {
    stubFetch({ a: 500, b: 1500 });
    render(
      <Wrap
        profile={{
          monthlyDomesticBrl: 5000,
          monthlyInternationalUsd: 0,
          redemption: { kind: "any" },
          currentCardIds: ["a"],
        }}
      >
        <CompareSubstituteCTA cards={[makeCard("a", "Alpha"), makeCard("b", "Beta")]} />
      </Wrap>,
    );
    expect(await screen.findByText(/Substituir/i)).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText(/\+R\$\s?1\.000,00\/ano/)).toBeInTheDocument();
  });

  it("renders CTA when current card is NOT in comparator (resolves name from API)", async () => {
    const externalCard = makeCard("a", "External Current");
    externalCard.bank = "inter";
    stubFetch({ a: 500, b: 1500 }, externalCard);
    render(
      <Wrap
        profile={{
          monthlyDomesticBrl: 5000,
          monthlyInternationalUsd: 0,
          redemption: { kind: "any" },
          currentCardIds: ["a"],
        }}
      >
        <CompareSubstituteCTA cards={[makeCard("b", "Beta"), makeCard("c", "Charlie")]} />
      </Wrap>,
    );
    expect(await screen.findByText(/External Current/)).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("navigates to /results on button click", async () => {
    stubFetch({ a: 500, b: 1500 });
    render(
      <Wrap
        profile={{
          monthlyDomesticBrl: 5000,
          monthlyInternationalUsd: 0,
          redemption: { kind: "any" },
          currentCardIds: ["a"],
        }}
      >
        <CompareSubstituteCTA cards={[makeCard("a", "Alpha"), makeCard("b", "Beta")]} />
      </Wrap>,
    );
    const button = await screen.findByRole("button", { name: /Ver recomendação/i });
    await userEvent.click(button);
    expect(await screen.findByText(/results page/)).toBeInTheDocument();
  });
});
