import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { fetchRecommendation } from "@/lib/api";
import { log } from "@/lib/log";
import type { Recommendation, RecommendationEnvelope, SolverError, SpendingProfile } from "@/types";
import type { Result } from "@/lib/result";

const CACHE_KEY = "vertice.recommendation.v2";
const CACHE_VERSION = 2;

interface CachedData {
  version: number;
  profileKey: string;
  recommendation: Recommendation;
  catalogVersion: string;
  solverVersion: string;
  savedAt: string;
}

const cacheKey = (profile: SpendingProfile, ptaxOverride?: number): string =>
  JSON.stringify({ profile, ptaxOverride });

const readCache = (profile: SpendingProfile, ptaxOverride?: number): Recommendation | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw === null) return null;
    const data = JSON.parse(raw) as CachedData;
    if (data.version !== CACHE_VERSION) return null;
    if (data.profileKey !== cacheKey(profile, ptaxOverride)) return null;
    if (typeof data.catalogVersion !== "string" || typeof data.solverVersion !== "string") {
      return null;
    }
    return data.recommendation;
  } catch (error) {
    log.error(error, { surface: "recommendation-cache-read" });
    return null;
  }
};

const writeCache = (
  profile: SpendingProfile,
  ptaxOverride: number | undefined,
  envelope: RecommendationEnvelope,
): void => {
  try {
    const data: CachedData = {
      version: CACHE_VERSION,
      profileKey: cacheKey(profile, ptaxOverride),
      recommendation: envelope.recommendation,
      catalogVersion: envelope.catalogVersion,
      solverVersion: envelope.solverVersion,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    log.error(error, { surface: "recommendation-cache-write" });
  }
};

export const clearRecommendationCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem("vertice.recommendation.v1");
  } catch (error) {
    log.error(error, { surface: "recommendation-cache-clear" });
  }
};

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

export const useRecommendation = (): Result<Recommendation, SolverError> | null => {
  const { profile, ptaxOverride } = useSession();
  const [result, setResult] = useState<Result<Recommendation, SolverError> | null>(() => {
    if (profile === null) return null;
    const cached = readCache(profile, ptaxOverride ?? undefined);
    return cached !== null ? { ok: true, value: cached } : null;
  });

  useEffect(() => {
    if (profile === null) {
      setResult(null);
      return;
    }

    // Cache-first: when a cached recommendation matches the current profile +
    // ptaxOverride, serve it without hitting the API. The cache is invalidated
    // when:
    //   - the user changes any field in the profile (different cacheKey)
    //   - InputForm.reset calls clearRecommendationCache()
    //   - ErrorBoundary "Limpar dados e recarregar" wipes localStorage
    //   - we bump CACHE_VERSION on deploy (kill switch for schema changes)
    const cached = readCache(profile, ptaxOverride ?? undefined);
    if (cached !== null) {
      setResult({ ok: true, value: cached });
      return;
    }

    setResult(null);

    const controller = new AbortController();

    fetchRecommendation(profile, ptaxOverride ?? undefined, { signal: controller.signal })
      .then((nextResult) => {
        if (controller.signal.aborted) return;
        if (nextResult.ok) {
          writeCache(profile, ptaxOverride ?? undefined, nextResult.value);
          setResult({ ok: true, value: nextResult.value.recommendation });
          return;
        }
        setResult(nextResult);
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        setResult({
          ok: false,
          error: { code: "NETWORK_ERROR", message: "Não foi possível conectar à API." },
        });
      });

    return () => {
      controller.abort();
    };
  }, [profile, ptaxOverride]);

  return result;
};
