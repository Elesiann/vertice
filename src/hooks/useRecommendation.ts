import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { fetchRecommendation } from "@/lib/api";
import type { Recommendation, SolverError } from "@/types";
import type { Result } from "@/lib/result";

export const useRecommendation = (): Result<Recommendation, SolverError> | null => {
  const { profile, ptaxOverride } = useSession();
  const [result, setResult] = useState<Result<Recommendation, SolverError> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (profile === null) {
      setResult(null);
      return;
    }

    setResult(null);
    void fetchRecommendation(profile, ptaxOverride ?? undefined).then((nextResult) => {
      if (!cancelled) setResult(nextResult);
    });

    return () => {
      cancelled = true;
    };
  }, [profile, ptaxOverride]);

  return result;
};
