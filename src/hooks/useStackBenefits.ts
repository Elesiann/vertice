import { useEffect, useState } from "react";
import { fetchCardDetail } from "@/lib/api";
import type { StackEvaluation } from "@/types";

// Free-text benefit highlights ("Lounge ilimitado (...)", "Pontos não expiram", ...) for every
// card in a stack, deduped and in catalog order. `null` while the card details are loading; an
// empty array once loaded if no card carries any. Mirrors the fetch pattern in useRecommendation.
export const useStackBenefits = (stack: StackEvaluation | undefined): string[] | null => {
  const cardKey = stack?.cards.map((card) => card.id).join("|") ?? "";
  const [benefits, setBenefits] = useState<string[] | null>(null);

  useEffect(() => {
    if (cardKey === "") {
      setBenefits(null);
      return;
    }
    let cancelled = false;
    setBenefits(null);
    void Promise.all(cardKey.split("|").map((id) => fetchCardDetail(id))).then((results) => {
      if (cancelled) return;
      const labels = results.flatMap((result) =>
        result.ok ? (result.value.benefits ?? []).map((benefit) => benefit.label) : [],
      );
      setBenefits([...new Set(labels)]);
    });
    return () => {
      cancelled = true;
    };
  }, [cardKey]);

  return benefits;
};
