import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { fetchRecommendation } from "@/lib/api";
import type { Recommendation, SolverError, SpendingProfile } from "@/types";
import type { Result } from "@/lib/result";

const CACHE_KEY = "vertice.recommendation.v1";

interface CachedData {
  profileKey: string;
  recommendation: Recommendation;
  savedAt: string;
}

const cacheKey = (profile: SpendingProfile, ptaxOverride?: number): string =>
  JSON.stringify({ profile, ptaxOverride });

const readCache = (profile: SpendingProfile, ptaxOverride?: number): Recommendation | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw === null) return null;
    const data = JSON.parse(raw) as CachedData;
    if (data.profileKey !== cacheKey(profile, ptaxOverride)) return null;
    return data.recommendation;
  } catch {
    return null;
  }
};

const writeCache = (
  profile: SpendingProfile,
  ptaxOverride: number | undefined,
  recommendation: Recommendation,
): void => {
  try {
    const data: CachedData = {
      profileKey: cacheKey(profile, ptaxOverride),
      recommendation,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
};

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

    const cached = readCache(profile, ptaxOverride ?? undefined);
    if (cached !== null) {
      setResult({ ok: true, value: cached });
      return;
    }

    setResult(null);
    let cancelled = false;

    void fetchRecommendation(profile, ptaxOverride ?? undefined).then((nextResult) => {
      if (!cancelled) {
        if (nextResult.ok) {
          writeCache(profile, ptaxOverride ?? undefined, nextResult.value);
        }
        setResult(nextResult);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [profile, ptaxOverride]);

  return result;
};
