import { currentCardIsBest } from "@/features/results/alternatives";
import type { Recommendation, SpendingProfile, StackEvaluation } from "@/types";

export const displayStackFor = (recommendation: Recommendation): StackEvaluation =>
  recommendation.scoreLab?.decisionTracks?.recommendedNow ?? recommendation.topStack;

export const displayStackForProfile = (
  recommendation: Recommendation,
  profile: SpendingProfile,
): StackEvaluation =>
  currentCardIsBest(recommendation, profile) && recommendation.currentStack !== undefined
    ? recommendation.currentStack
    : displayStackFor(recommendation);

export const firstDisplayCardId = (
  recommendation: Recommendation,
  profile: SpendingProfile,
): string | null => {
  const stack = displayStackForProfile(recommendation, profile);
  return stack.cards[0]?.id ?? stack.allocation[0]?.cardId ?? null;
};
