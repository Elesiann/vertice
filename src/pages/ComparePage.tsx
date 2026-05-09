import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchCardCatalog, fetchCardDetail } from "@/lib/api";
import { useCompareStore } from "@/lib/compare-store";
import { CompareTable } from "@/features/compare/CompareTable";
import { CompareEmpty } from "@/features/compare/CompareEmpty";
import { CompareNarrativeBanner } from "@/features/compare/CompareNarrativeBanner";
import type { PublicCardDetail, PublicCatalogCard } from "@/types";

type CardResult =
  | { status: "loading"; id: string }
  | { status: "ok"; card: PublicCardDetail }
  | { status: "error"; id: string; message: string };

export const ComparePage = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { ids: storeIds, add } = useCompareStore();
  const [results, setResults] = useState<CardResult[]>([]);
  const [catalogCards, setCatalogCards] = useState<PublicCatalogCard[]>([]);

  const urlIds = (searchParams.get("ids") ?? "")
    .split(",")
    .filter((id) => id.length > 0)
    .slice(0, 4);
  const effectiveIds = urlIds.length > 0 ? urlIds : storeIds;

  const writeIds = useCallback(
    (ids: string[]) => {
      const next = Array.from(new Set(ids)).slice(0, 4);
      next.forEach((id) => {
        add(id);
      });
      setSearchParams({ ids: next.join(",") });
    },
    [add, setSearchParams],
  );

  const handleAddCard = useCallback(
    (id: string) => {
      if (effectiveIds.includes(id) || effectiveIds.length >= 4) return;
      writeIds([...effectiveIds, id]);
    },
    [effectiveIds, writeIds],
  );

  const handleRemoveCard = useCallback(
    (id: string) => {
      const next = effectiveIds.filter((cardId) => cardId !== id);
      useCompareStore.getState().remove(id);
      setSearchParams({ ids: next.join(",") });
    },
    [effectiveIds, setSearchParams],
  );

  useEffect(() => {
    if (urlIds.length > 0) {
      urlIds.forEach((id) => {
        add(id);
      });
    } else if (storeIds.length > 0) {
      setSearchParams({ ids: storeIds.join(",") }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetchCardCatalog({}).then((response) => {
      setCatalogCards(response.cards);
    });
  }, []);

  useEffect(() => {
    if (effectiveIds.length === 0) {
      setResults([]);
      return;
    }
    setResults(effectiveIds.map((id) => ({ status: "loading" as const, id })));

    effectiveIds.forEach((id, i) => {
      void fetchCardDetail(id).then((result) => {
        setResults((prev) => {
          const next = [...prev];
          if (result.ok) {
            next[i] = { status: "ok", card: result.value };
          } else {
            next[i] = { status: "error", id, message: result.error.message };
          }
          return next;
        });
        return undefined;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveIds.join(",")]);

  if (effectiveIds.length === 0) {
    return <CompareEmpty />;
  }

  const loadedCards = results
    .filter((r): r is { status: "ok"; card: PublicCardDetail } => r.status === "ok")
    .map((r) => r.card);

  const hasAnyLoading = results.some((r) => r.status === "loading");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-display-3 text-ink mb-6">Comparar Cartões</h1>
      {hasAnyLoading && (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando cartões">
          {effectiveIds.map((id) => (
            <div key={id} className="bg-surface-sunken h-8 animate-pulse rounded" />
          ))}
        </div>
      )}
      {results
        .filter((r): r is { status: "error"; id: string; message: string } => r.status === "error")
        .map((r) => (
          <p key={r.id} className="text-body-sm text-danger mb-2">
            {r.id}: {r.message}
          </p>
        ))}
      {!hasAnyLoading && loadedCards.length >= 2 && (
        <>
          <CompareNarrativeBanner cards={loadedCards} />
          <CompareTable
            cards={loadedCards}
            catalogCards={catalogCards}
            onAddCard={handleAddCard}
            onRemoveCard={handleRemoveCard}
          />
        </>
      )}
      {!hasAnyLoading && loadedCards.length === 1 && (
        <p className="text-body-sm text-ink-muted">Selecione pelo menos 2 cartões para comparar.</p>
      )}
    </div>
  );
};
