import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { fetchRecommendation } from "@/lib/api";

export type ModeledReturnsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; byCardId: Record<string, number> }
  | { status: "error"; message: string };

/**
 * Returns the per-card modeled net return for the user's current profile.
 *
 * The hook short-circuits to `idle` when there is no profile in session — by
 * design, the comparator hides the modeled-return row until the user runs the
 * recommender at least once (handoff §8.3).
 */
export const useModeledReturns = (): ModeledReturnsState => {
  const { profile, ptaxOverride } = useSession();
  const [state, setState] = useState<ModeledReturnsState>({ status: "idle" });

  useEffect(() => {
    if (profile === null) {
      setState({ status: "idle" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    void fetchRecommendation(profile, ptaxOverride ?? undefined).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      const map = result.value.scoreLab?.singleCardNetReturnByCardId ?? {};
      setState({ status: "ready", byCardId: map });
    });
    return () => {
      cancelled = true;
    };
  }, [profile, ptaxOverride]);

  return state;
};
