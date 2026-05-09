import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SessionProvider, useSession } from "@/context/SessionContext";
import type { PublicCardDetail, Recommendation, SpendingProfile } from "@/types";

const recommendation: Recommendation = {
  topStack: {
    cards: [
      {
        id: "current-card",
        name: "Current Card",
        bank: "other",
        pointsProgram: "cashback",
        requiresRelationship: "open",
      },
    ],
    allocation: [{ cardId: "current-card", monthlyDomesticBrl: 5000, monthlyInternationalUsd: 0 }],
    liquidity: "high",
    yearOneAnnualFeeBrl: 0,
    yearOneWelcomeBonusPoints: 0,
    yearOneEarnedPoints: 0,
    yearOneTotalPoints: 0,
    yearOneTotalValueBrl: 0,
    yearOneNetValueBrl: 0,
    warnings: [],
    confidence: "high",
  },
  alternatives: [],
  leaderboardsByAxis: [],
  isReturnDecisionTight: false,
  moneyOnTheTableBrl: 999,
  travelTranslation: {
    program: "cashback",
    flight: "n/a",
    pointsRequired: 0,
    compatiblePoints: 0,
    trips: 0,
    remainingPoints: 0,
  },
  shoutout: "",
};

const cardDetail: PublicCardDetail = {
  id: "current-card",
  name: "Current Card",
  bank: "other",
  brand: "mastercard",
  tier: "black",
  pointsProgram: "cashback",
  annualFeeBrl: 0,
  hasLoungeAccess: false,
  hasTravelInsurance: false,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
};

const stubFetch = (): void => {
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
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(cardDetail),
      });
    }),
  );
};

const Seed = ({ profile }: { profile: SpendingProfile }): null => {
  const { setProfile } = useSession();
  useEffect(() => {
    setProfile(profile);
  }, [profile, setProfile]);
  return null;
};

const renderAt = (path: string): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <Seed
          profile={{
            monthlyDomesticBrl: 5000,
            monthlyInternationalUsd: 0,
            redemption: { kind: "any" },
            currentCardIds: ["current-card"],
          }}
        />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<div>home page</div>} />
            <Route path="/input" element={<div>input page</div>} />
            <Route path="/results" element={<div>results page</div>} />
            <Route path="/cards" element={<div>catalog page</div>} />
            <Route path="/compare" element={<div>compare page</div>} />
          </Route>
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
};

describe("Layout", () => {
  beforeEach(() => {
    window.localStorage.clear();
    stubFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders banner on /", async () => {
    renderAt("/");
    expect(await screen.findByRole("link", { name: /na mesa/i })).toBeInTheDocument();
    expect(screen.getByText(/home page/)).toBeInTheDocument();
  });

  it("renders banner on /cards", async () => {
    renderAt("/cards");
    expect(await screen.findByRole("link", { name: /na mesa/i })).toBeInTheDocument();
  });

  it("renders banner on /compare", async () => {
    renderAt("/compare");
    expect(await screen.findByRole("link", { name: /na mesa/i })).toBeInTheDocument();
  });

  it("does not render banner on /input", async () => {
    renderAt("/input");
    await screen.findByText(/input page/);
    expect(screen.queryByRole("link", { name: /na mesa/i })).not.toBeInTheDocument();
  });

  it("does not render banner on /results", async () => {
    renderAt("/results");
    await screen.findByText(/results page/);
    expect(screen.queryByRole("link", { name: /na mesa/i })).not.toBeInTheDocument();
  });
});
