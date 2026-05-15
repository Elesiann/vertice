import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { m } from "framer-motion";
import { fetchCardCatalog, fetchCardDetail } from "@/lib/api";
import { BackLink } from "@/components/ui/BackLink";
import { RevealBlock, RevealGroup, revealItemVariants } from "@/components/ui/Reveal";
import { CompareTable } from "@/features/compare/CompareTable";
import { CompareEmpty } from "@/features/compare/CompareEmpty";
import { useSession } from "@/context/SessionContext";
import { formatBrl } from "@/lib/format";
import { useCompareActions } from "@/features/compare/useCompareActions";
import type { PublicCardDetail, PublicCatalogCard } from "@/types";

type CardResult =
  | { status: "loading"; id: string }
  | { status: "ok"; card: PublicCardDetail }
  | { status: "error"; id: string; message: string };

export const ComparePage = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { ids: storeIds, setCards } = useCompareActions();
  const { profile } = useSession();
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
      setCards(next);
      setSearchParams({ ids: next.join(",") });
    },
    [setCards, setSearchParams],
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
      if (effectiveIds.length <= 2) return;
      const next = effectiveIds.filter((cardId) => cardId !== id);
      writeIds(next);
    },
    [effectiveIds, writeIds],
  );

  const handleAddRecommendedCard = useCallback(
    (id: string, replaceId?: string) => {
      if (effectiveIds.includes(id)) return;
      const fallbackReplaceId = effectiveIds.at(-1);
      const idToReplace = replaceId ?? fallbackReplaceId;
      const baseIds =
        effectiveIds.length >= 4 && idToReplace !== undefined
          ? effectiveIds.filter((cardId) => cardId !== idToReplace)
          : effectiveIds;
      writeIds([...baseIds, id]);
    },
    [effectiveIds, writeIds],
  );

  useEffect(() => {
    if (urlIds.length > 0) {
      setCards(urlIds);
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

    let cancelled = false;
    const requestIds = [...effectiveIds];
    requestIds.forEach((id, i) => {
      void fetchCardDetail(id).then((result) => {
        setResults((prev) => {
          if (cancelled) return prev;
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
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveIds.join(",")]);

  if (effectiveIds.length === 0) {
    return <CompareEmpty />;
  }

  const loadedCards = results.reduce<PublicCardDetail[]>((cards, result) => {
    if (result.status === "ok") cards.push(result.card);
    return cards;
  }, []);

  const hasAnyLoading = results.some((r) => r.status === "loading");

  return (
    <RevealGroup className="mx-auto max-w-6xl px-4 py-8">
      <RevealBlock>
        <BackLink className="mb-4" to="/cards">
          Catálogo
        </BackLink>
        <h1 className="text-display-3 text-ink mb-1">Comparar Cartões</h1>

        {profile !== null ? (
          <p className="text-body-sm text-ink-muted mb-4 flex flex-wrap items-center gap-1.5">
            <span>
              {effectiveIds.length} {effectiveIds.length === 1 ? "cartão" : "cartões"} em comparação
            </span>
            <span className="text-ink-subtle">·</span>
            <span>
              Modelado para gasto de{" "}
              <span className="text-ink font-semibold">
                {formatBrl(profile.monthlyDomesticBrl)}/mês
              </span>
            </span>
            <span className="text-ink-subtle">·</span>
            <Link
              to="/input"
              className="text-ink-muted hover:text-accent underline underline-offset-2 transition-colors"
            >
              ajustar perfil →
            </Link>
          </p>
        ) : (
          <p className="text-body-sm text-ink-muted mb-4">
            {effectiveIds.length} {effectiveIds.length === 1 ? "cartão" : "cartões"} em comparação
          </p>
        )}

        {profile === null && (
          <div className="mb-6">
            <Link
              to="/input"
              className="bg-action text-action-ink hover:bg-action-hover focus-visible:ring-accent inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              Definir perfil para ver retorno modelado →
            </Link>
          </div>
        )}
      </RevealBlock>

      {hasAnyLoading && (
        <m.div
          variants={revealItemVariants}
          className="flex flex-col gap-4"
          aria-busy="true"
          aria-label="Carregando cartões"
        >
          {effectiveIds.map((id) => (
            <div key={id} className="bg-surface-sunken h-8 animate-pulse rounded" />
          ))}
        </m.div>
      )}
      {results.map((result) =>
        result.status === "error" ? (
          <m.p
            key={result.id}
            variants={revealItemVariants}
            className="text-body-sm text-danger mb-2"
          >
            {result.id}: {result.message}
          </m.p>
        ) : null,
      )}
      {!hasAnyLoading && loadedCards.length >= 2 && (
        <RevealBlock>
          <CompareTable
            cards={loadedCards}
            catalogCards={catalogCards}
            onAddCard={handleAddCard}
            onAddRecommendedCard={handleAddRecommendedCard}
            onRemoveCard={handleRemoveCard}
          />
        </RevealBlock>
      )}
      {!hasAnyLoading && loadedCards.length === 1 && (
        <RevealBlock>
          <p className="text-body-sm text-ink-muted">
            Selecione pelo menos 2 cartões para comparar.
          </p>
        </RevealBlock>
      )}
    </RevealGroup>
  );
};
