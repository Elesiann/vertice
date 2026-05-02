import { useMemo } from "react";
import { catalog } from "@/data/catalog";
import { useSession } from "@/context/SessionContext";
import { recommend } from "@/lib/solver";
import type { Recommendation, SolverError, SpendingProfile } from "@/types";
import type { Result } from "@/lib/result";

interface RecommendationState {
  profile: SpendingProfile | null;
  result: Result<Recommendation, SolverError> | null;
}

export const useRecommendation = (): RecommendationState => {
  const { profile, ptaxOverride } = useSession();

  const result = useMemo<Result<Recommendation, SolverError> | null>(() => {
    if (profile === null) return null;
    return recommend(profile, catalog, {
      ...(ptaxOverride !== null ? { ptaxRate: ptaxOverride } : {}),
    });
  }, [profile, ptaxOverride]);

  return { profile, result };
};
