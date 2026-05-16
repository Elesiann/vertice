import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { clearRecommendationCache, useRecommendation } from "@/hooks/useRecommendation";
import { ok, fail } from "@/lib/result";
import type {
  Recommendation,
  RecommendationEnvelope,
  SolverError,
  SpendingProfile,
  StackEvaluation,
} from "@/types";

const fetchRecommendationMock = vi.hoisted(() =>
  vi.fn<
    (
      profile: SpendingProfile,
      ptaxRate?: number,
      opts?: { signal?: AbortSignal },
    ) => Promise<
      ReturnType<typeof ok<RecommendationEnvelope>> | ReturnType<typeof fail<SolverError>>
    >
  >(),
);

vi.mock("@/lib/api", () => ({
  fetchRecommendation: fetchRecommendationMock,
}));

const profile: SpendingProfile = {
  monthlyDomesticBrl: 5000,
  monthlyInternationalUsd: 200,
  redemption: { kind: "any" },
};

const emptyStack: StackEvaluation = {
  cards: [],
  allocation: [],
  liquidity: "low",
  yearOneAnnualFeeBrl: 0,
  yearOneWelcomeBonusPoints: 0,
  yearOneEarnedPoints: 0,
  yearOneTotalPoints: 0,
  yearOneTotalValueBrl: 0,
  yearOneNetValueBrl: 0,
  warnings: [],
  confidence: "low",
};

const minimalRecommendation: Recommendation = {
  topStack: emptyStack,
  alternatives: [],
  leaderboardsByAxis: [],
  isReturnDecisionTight: false,
  travelTranslation: { kind: "cashback", valueBrl: 0 },
  shoutout: "Sem recomendação",
};

const envelope = (recommendation = minimalRecommendation): RecommendationEnvelope => ({
  recommendation,
  catalogVersion: "test",
  solverVersion: "test",
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

const seedProfile = (next: SpendingProfile | null): void => {
  const { result } = renderHook(() => useSession(), { wrapper });
  act(() => {
    result.current.setProfile(next);
  });
};

describe("useRecommendation", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchRecommendationMock.mockReset();
  });

  afterEach(() => {
    clearRecommendationCache();
  });

  it("returns null when no profile is set", () => {
    const { result } = renderHook(() => useRecommendation(), { wrapper });
    expect(result.current).toBeNull();
    expect(fetchRecommendationMock).not.toHaveBeenCalled();
  });

  it("serves cache without hitting the API when one matches the profile", async () => {
    const cached = envelope();
    localStorage.setItem(
      "vertice.recommendation.v2",
      JSON.stringify({
        version: 2,
        profileKey: JSON.stringify({ profile, ptaxOverride: undefined }),
        recommendation: cached.recommendation,
        catalogVersion: cached.catalogVersion,
        solverVersion: cached.solverVersion,
        savedAt: new Date().toISOString(),
      }),
    );
    fetchRecommendationMock.mockResolvedValue(ok(cached));

    const renderResult = renderHook(
      () => {
        const session = useSession();
        const rec = useRecommendation();
        return { session, rec };
      },
      { wrapper },
    );

    act(() => {
      renderResult.result.current.session.setProfile(profile);
    });

    await waitFor(() => {
      expect(renderResult.result.current.rec?.ok).toBe(true);
    });
    expect(fetchRecommendationMock).not.toHaveBeenCalled();
  });

  it("refetches when the profile changes to one without cache", async () => {
    const cached = envelope();
    localStorage.setItem(
      "vertice.recommendation.v2",
      JSON.stringify({
        version: 2,
        profileKey: JSON.stringify({ profile, ptaxOverride: undefined }),
        recommendation: cached.recommendation,
        catalogVersion: cached.catalogVersion,
        solverVersion: cached.solverVersion,
        savedAt: new Date().toISOString(),
      }),
    );
    fetchRecommendationMock.mockResolvedValue(ok(envelope()));

    const renderResult = renderHook(
      () => {
        const session = useSession();
        const rec = useRecommendation();
        return { session, rec };
      },
      { wrapper },
    );

    act(() => {
      renderResult.result.current.session.setProfile(profile);
    });
    await waitFor(() => {
      expect(renderResult.result.current.rec?.ok).toBe(true);
    });
    expect(fetchRecommendationMock).not.toHaveBeenCalled();

    const differentProfile = { ...profile, monthlyDomesticBrl: profile.monthlyDomesticBrl + 1000 };
    act(() => {
      renderResult.result.current.session.setProfile(differentProfile);
    });

    await waitFor(() => {
      expect(fetchRecommendationMock).toHaveBeenCalledTimes(1);
    });
  });

  it("requests a fresh recommendation when no cache is present", async () => {
    fetchRecommendationMock.mockResolvedValue(ok(envelope()));

    const renderResult = renderHook(
      () => {
        const session = useSession();
        const rec = useRecommendation();
        return { session, rec };
      },
      { wrapper },
    );

    act(() => {
      renderResult.result.current.session.setProfile(profile);
    });

    await waitFor(() => {
      expect(fetchRecommendationMock).toHaveBeenCalled();
      expect(renderResult.result.current.rec?.ok).toBe(true);
    });
  });

  it("surfaces NETWORK_ERROR when there is no cache and the API is offline", async () => {
    fetchRecommendationMock.mockResolvedValue(
      fail<SolverError>({ code: "NETWORK_ERROR", message: "offline" }),
    );

    const renderResult = renderHook(
      () => {
        const session = useSession();
        const rec = useRecommendation();
        return { session, rec };
      },
      { wrapper },
    );

    act(() => {
      renderResult.result.current.session.setProfile(profile);
    });

    await waitFor(() => {
      expect(renderResult.result.current.rec?.ok).toBe(false);
    });
    expect(renderResult.result.current.rec).toEqual({
      ok: false,
      error: { code: "NETWORK_ERROR", message: "offline" },
    });
  });

  it("propagates non-network errors to the result", async () => {
    fetchRecommendationMock.mockResolvedValue(
      fail<SolverError>({ code: "NO_ELIGIBLE_CARDS", message: "Nada se encaixa." }),
    );

    const renderResult = renderHook(
      () => {
        const session = useSession();
        const rec = useRecommendation();
        return { session, rec };
      },
      { wrapper },
    );

    act(() => {
      renderResult.result.current.session.setProfile(profile);
    });

    await waitFor(() => {
      expect(renderResult.result.current.rec?.ok).toBe(false);
    });
    expect(renderResult.result.current.rec).toEqual({
      ok: false,
      error: { code: "NO_ELIGIBLE_CARDS", message: "Nada se encaixa." },
    });
  });

  it("passes an AbortSignal to fetchRecommendation", async () => {
    fetchRecommendationMock.mockResolvedValue(ok(envelope()));

    const renderResult = renderHook(
      () => {
        const session = useSession();
        const rec = useRecommendation();
        return { session, rec };
      },
      { wrapper },
    );

    act(() => {
      renderResult.result.current.session.setProfile(profile);
    });

    await waitFor(() => {
      expect(fetchRecommendationMock).toHaveBeenCalled();
    });
    const [, , opts] = fetchRecommendationMock.mock.calls[0] ?? [];
    expect(opts?.signal).toBeInstanceOf(AbortSignal);
  });
});

// Quiet "ignore unused" guard so the helper isn't dropped by tree-shaking
// when the suite expands.
void seedProfile;
