import { useMemo } from "react";
import { catalog } from "@/data/catalog";
import { useSession } from "@/context/SessionContext";
import { recommend } from "@/lib/solver";
import type { Recommendation, SolverError } from "@/types";
import type { Result } from "@/lib/result";

export const useRecommendation = (): Result<Recommendation, SolverError> | null => {
  const { profile, ptaxOverride } = useSession();

  return useMemo<Result<Recommendation, SolverError> | null>(() => {
    if (profile === null) return null;
    return recommend(profile, catalog, {
      ...(ptaxOverride !== null ? { ptaxRate: ptaxOverride } : {}),
    });
  }, [profile, ptaxOverride]);
};
