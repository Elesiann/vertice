import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/context/SessionContext";
import { useModeledReturns } from "@/features/compare/useModeledReturns";
import { fetchCardDetail } from "@/lib/api";
import { formatBrl } from "@/lib/format";
import { ROUTES } from "@/routes";
import type { PublicCardDetail } from "@/types";

interface CompareSubstituteCTAProps {
  cards: PublicCardDetail[];
}

export const CompareSubstituteCTA = ({ cards }: CompareSubstituteCTAProps): JSX.Element | null => {
  const { profile } = useSession();
  const modeled = useModeledReturns();
  const navigate = useNavigate();
  const currentCardId = profile?.currentCardIds?.[0];
  const [currentNameFromApi, setCurrentNameFromApi] = useState<string | null>(null);

  const currentInComparator = cards.find((c) => c.id === currentCardId);

  useEffect(() => {
    if (currentCardId === undefined || currentInComparator !== undefined) {
      setCurrentNameFromApi(null);
      return;
    }
    let cancelled = false;
    void fetchCardDetail(currentCardId).then((res) => {
      if (cancelled) return;
      setCurrentNameFromApi(res.ok ? res.value.name : null);
    });
    return () => {
      cancelled = true;
    };
  }, [currentCardId, currentInComparator]);

  if (currentCardId === undefined) return null;
  if (modeled.status !== "ready") return null;

  const currentReturn = modeled.byCardId[currentCardId];
  if (currentReturn === undefined) return null;

  const ranked = cards
    .filter((c) => c.id !== currentCardId)
    .map((c) => ({ card: c, ret: modeled.byCardId[c.id] }))
    .filter((entry): entry is { card: PublicCardDetail; ret: number } => entry.ret !== undefined)
    .sort((a, b) => b.ret - a.ret);
  const leader = ranked[0];
  if (leader === undefined) return null;
  if (leader.ret <= currentReturn) return null;

  const currentName = currentInComparator?.name ?? currentNameFromApi;
  if (currentName === null) return null;

  const delta = leader.ret - currentReturn;

  return (
    <div className="border-line mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      <p className="text-body-sm text-ink-muted">
        Substituir <span className="text-ink font-semibold">{currentName}</span> por{" "}
        <span className="text-ink font-semibold">{leader.card.name}</span>:{" "}
        <span className="text-num text-accent font-semibold">+{formatBrl(delta)}/ano</span>.
      </p>
      <Button
        variant="secondary"
        size="md"
        onClick={() => {
          void navigate(ROUTES.RESULTS);
        }}
      >
        Ver recomendação →
      </Button>
    </div>
  );
};
