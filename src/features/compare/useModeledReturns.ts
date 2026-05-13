import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { fetchRecommendation } from "@/lib/api";
import { firstDisplayCardId } from "@/features/results/display-recommendation";
import type { Recommendation, StackEvaluation } from "@/types";

export interface ModeledCardRewards {
  grossValueBrl: number;
  earnedPoints: number;
  totalPoints: number;
}

export type ModeledReturnsState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      byCardId: Record<string, number>;
      rewardsByCardId: Record<string, ModeledCardRewards>;
      recommendedCardId: string | null;
      ptaxRate: number | null;
    }
  | { status: "error"; message: string };

const addSingleCardRewards = (
  out: Record<string, ModeledCardRewards>,
  stack: StackEvaluation | null | undefined,
): void => {
  if (stack?.cards.length !== 1) return;
  const cardId = stack.cards[0]?.id ?? stack.allocation[0]?.cardId;
  const modeledAnnual = stack.scoreLab?.modeledAnnual;
  if (cardId === undefined || modeledAnnual === undefined) return;
  out[cardId] = {
    grossValueBrl: modeledAnnual.grossValueBrl,
    earnedPoints: modeledAnnual.earnedPoints,
    totalPoints: modeledAnnual.totalPoints,
  };
};

const singleCardRewardsByCardId = (
  recommendation: Recommendation,
): Record<string, ModeledCardRewards> => {
  const out: Record<string, ModeledCardRewards> = {};
  addSingleCardRewards(out, recommendation.topStack);
  addSingleCardRewards(out, recommendation.currentStack);
  recommendation.alternatives.forEach((stack) => {
    addSingleCardRewards(out, stack);
  });
  recommendation.leaderboardsByAxis.forEach((axis) => {
    axis.stacks.forEach((stack) => {
      addSingleCardRewards(out, stack);
    });
  });
  const scoreLab = recommendation.scoreLab;
  if (scoreLab !== undefined) {
    addSingleCardRewards(out, scoreLab.netReturnLeader);
    addSingleCardRewards(out, scoreLab.institutionalAlternative?.stack);
    scoreLab.nearUnlocks.forEach((stack) => {
      addSingleCardRewards(out, stack);
    });
    const tracks = scoreLab.decisionTracks;
    if (tracks !== undefined) {
      addSingleCardRewards(out, tracks.recommendedNow);
      addSingleCardRewards(out, tracks.actionable);
      addSingleCardRewards(out, tracks.nearUnlock);
      addSingleCardRewards(out, tracks.stretch);
      addSingleCardRewards(out, tracks.conditionalUpside);
      addSingleCardRewards(out, tracks.closestActionableSubstitute?.stack);
    }
  }
  return out;
};

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
      setState({
        status: "ready",
        byCardId: map,
        rewardsByCardId: singleCardRewardsByCardId(result.value),
        recommendedCardId: firstDisplayCardId(result.value, profile),
        ptaxRate: result.value.scoreLab?.ptaxRate ?? null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [profile, ptaxOverride]);

  return state;
};
