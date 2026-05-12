import { useEffect, type JSX } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { CurrentCardBanner } from "@/components/domain/CurrentCardBanner";
import { SessionProvider, useSession } from "@/context/SessionContext";
import type { PublicCardDetail, Recommendation, SpendingProfile } from "@/types";

const baseStack: Recommendation["topStack"] = {
  cards: [
    {
      id: "current-card",
      name: "Cartão Atual",
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
  yearOneNetValueBrl: 1000,
  warnings: [],
  confidence: "high",
};

const baseRecommendation: Recommendation = {
  topStack: baseStack,
  alternatives: [],
  leaderboardsByAxis: [],
  isReturnDecisionTight: false,
  travelTranslation: { kind: "cashback", valueBrl: 0 },
  shoutout: "",
};

const cardDetail: PublicCardDetail = {
  id: "current-card",
  name: "Inter Black",
  bank: "inter",
  brand: "mastercard",
  tier: "black",
  pointsProgram: "inter-loop",
  annualFeeBrl: 0,
  hasLoungeAccess: false,
  hasTravelInsurance: false,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
};

const stubFetch = (recommendation: Recommendation | null): void => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.includes("/score-lab/recommendations")) {
        if (recommendation === null) {
          return Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({ ok: false, error: { code: "NETWORK_ERROR", message: "x" } }),
          });
        }
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
      if (url.includes("/cards/") && !url.includes("/catalog")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(cardDetail),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }),
  );
};

const Seed = ({ profile }: { profile: SpendingProfile | null }): null => {
  const { setProfile } = useSession();
  useEffect(() => {
    if (profile !== null) setProfile(profile);
  }, [profile, setProfile]);
  return null;
};

const renderBanner = (profile: SpendingProfile | null): void => {
  render(
    <MemoryRouter initialEntries={["/cards"]}>
      <SessionProvider>
        <Seed profile={profile} />
        <Routes>
          <Route element={<LayoutShell />}>
            <Route path="/cards" element={<div>cards page</div>} />
            <Route path="/results" element={<div>results page</div>} />
          </Route>
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
};

const LayoutShell = (): JSX.Element => (
  <>
    <CurrentCardBanner />
    <Outlet />
  </>
);

describe("CurrentCardBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders link with current card name and money on the table", async () => {
    stubFetch({ ...baseRecommendation, moneyOnTheTableBrl: 1234 });
    renderBanner({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
      redemption: { kind: "any" },
      currentCardIds: ["current-card"],
    });

    const link = await screen.findByRole("link", { name: /Inter Black/i });
    expect(link).toHaveAttribute("href", "/results");
    expect(link).toHaveTextContent(/Inter Black/);
    expect(link).toHaveTextContent(/1\.234,00\/ano/);
    expect(link).toHaveTextContent(/na mesa/);
  });

  it("does not render when no profile is set", async () => {
    stubFetch({ ...baseRecommendation, moneyOnTheTableBrl: 1234 });
    renderBanner(null);
    await waitFor(() => {
      expect(screen.getByText(/cards page/)).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /na mesa/i })).not.toBeInTheDocument();
  });

  it("does not render when profile has no currentCardIds", async () => {
    const fetchSpy = vi.fn((url: string) => {
      if (url.includes("/score-lab/recommendations")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ok: true,
              data: { ...baseRecommendation, moneyOnTheTableBrl: 1234 },
              catalogVersion: "test",
              solverVersion: "test",
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    vi.stubGlobal("fetch", fetchSpy);

    renderBanner({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
      redemption: { kind: "any" },
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/score-lab\/recommendations$/),
        expect.any(Object),
      );
    });
    expect(screen.queryByRole("link", { name: /na mesa/i })).not.toBeInTheDocument();
  });

  it("does not render when moneyOnTheTableBrl is zero", async () => {
    const fetchSpy = vi.fn((url: string) => {
      if (url.includes("/score-lab/recommendations")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ok: true,
              data: { ...baseRecommendation, moneyOnTheTableBrl: 0 },
              catalogVersion: "test",
              solverVersion: "test",
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(cardDetail) });
    });
    vi.stubGlobal("fetch", fetchSpy);

    renderBanner({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
      redemption: { kind: "any" },
      currentCardIds: ["current-card"],
    });
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/score-lab\/recommendations$/),
        expect.any(Object),
      );
    });
    expect(screen.queryByRole("link", { name: /na mesa/i })).not.toBeInTheDocument();
  });

  it("does not render when moneyOnTheTableBrl is undefined", async () => {
    const fetchSpy = vi.fn((url: string) => {
      if (url.includes("/score-lab/recommendations")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ok: true,
              data: baseRecommendation,
              catalogVersion: "test",
              solverVersion: "test",
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(cardDetail) });
    });
    vi.stubGlobal("fetch", fetchSpy);

    renderBanner({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
      redemption: { kind: "any" },
      currentCardIds: ["current-card"],
    });
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/score-lab\/recommendations$/),
        expect.any(Object),
      );
    });
    expect(screen.queryByRole("link", { name: /na mesa/i })).not.toBeInTheDocument();
  });
});
