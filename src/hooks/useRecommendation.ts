import { useMemo } from "react";
import { loadCatalog } from "@/data/catalog";
import { useSession } from "@/context/SessionContext";
import { recommend } from "@/lib/solver";
import type { Catalog, Recommendation, SolverError, SpendingProfile } from "@/types";
import type { Result } from "@/lib/result";

const cachedCatalog: Catalog = loadCatalog();

interface RecommendationState {
  profile: SpendingProfile | null;
  result: Result<Recommendation, SolverError> | null;
}

export const useRecommendation = (): RecommendationState => {
  const { profile, ptaxOverride } = useSession();

  const result = useMemo<Result<Recommendation, SolverError> | null>(() => {
    if (profile === null) return null;
    return recommend(profile, cachedCatalog, {
      ...(ptaxOverride !== null ? { ptaxRate: ptaxOverride } : {}),
    });
  }, [profile, ptaxOverride]);

  return { profile, result };
};
