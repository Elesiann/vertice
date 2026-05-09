import { useEffect, useState, type JSX } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { useRecommendation } from "@/hooks/useRecommendation";
import { fetchCardDetail } from "@/lib/api";
import { formatBrl } from "@/lib/format";
import { ROUTES } from "@/lib/routes-constants";

export const CurrentCardBanner = (): JSX.Element | null => {
  const { profile } = useSession();
  const result = useRecommendation();
  const currentCardId = profile?.currentCardIds?.[0];
  const [cardName, setCardName] = useState<string | null>(null);

  useEffect(() => {
    if (currentCardId === undefined) {
      setCardName(null);
      return;
    }
    let cancelled = false;
    void fetchCardDetail(currentCardId).then((res) => {
      if (cancelled) return;
      setCardName(res.ok ? res.value.name : null);
    });
    return () => {
      cancelled = true;
    };
  }, [currentCardId]);

  if (currentCardId === undefined) return null;
  if (cardName === null) return null;
  if (!result?.ok) return null;

  const moneyOnTheTableBrl = result.value.moneyOnTheTableBrl;
  if (moneyOnTheTableBrl === undefined || moneyOnTheTableBrl <= 0) return null;

  return (
    <Link
      to={ROUTES.RESULTS}
      aria-label={`Você usa ${cardName}. Deixa ${formatBrl(moneyOnTheTableBrl)} por ano na mesa. Ver recomendação.`}
      className="border-line bg-surface-raised hover:bg-surface focus-visible:ring-accent block border-b transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
    >
      <div className="text-body-sm text-ink-muted mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <span>
          Você usa <span className="text-ink font-semibold">{cardName}</span>. Deixa{" "}
          <span className="text-num text-danger font-semibold">
            {formatBrl(moneyOnTheTableBrl)}/ano
          </span>{" "}
          na mesa.
        </span>
        <span aria-hidden className="text-ink-subtle text-base">
          →
        </span>
      </div>
    </Link>
  );
};
