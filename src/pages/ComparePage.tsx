import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { m } from "framer-motion";
import { fetchCardCatalog, fetchCardDetail } from "@/lib/api";
import { BackLink } from "@/components/ui/BackLink";
import { RevealBlock, RevealGroup, revealItemVariants } from "@/components/ui/Reveal";
import { PageMeta } from "@/components/seo/PageMeta";
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

const MAX_COMPARE = 4;

const parseIdsParam = (raw: string | null): string[] =>
  (raw ?? "")
    .split(",")
    .filter((id) => id.length > 0)
    .slice(0, MAX_COMPARE);

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

export const ComparePage = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { ids, setCards } = useCompareActions();
  const { profile } = useSession();
  const [results, setResults] = useState<CardResult[]>([]);
  const [catalogCards, setCatalogCards] = useState<PublicCatalogCard[]>([]);

  // One-shot reconciliation between URL and store on mount.
  //   - URL wins if it carries ids (shareable link, browser back).
  //   - Otherwise seed URL from store so the address bar stays canonical.
  // After mount, the store is the single source of truth and writeIds mirrors
  // the new state back into the URL.
  useEffect(() => {
    const urlIds = parseIdsParam(searchParams.get("ids"));
    if (urlIds.length > 0) {
      if (urlIds.join(",") !== ids.join(",")) {
        setCards(urlIds);
      }
    } else if (ids.length > 0) {
      setSearchParams({ ids: ids.join(",") }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writeIds = useCallback(
    (next: string[]) => {
      const deduped = Array.from(new Set(next)).slice(0, MAX_COMPARE);
      setCards(deduped);
      if (deduped.length > 0) {
        setSearchParams({ ids: deduped.join(",") }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    },
    [setCards, setSearchParams],
  );

  const handleAddCard = useCallback(
    (id: string) => {
      if (ids.includes(id) || ids.length >= MAX_COMPARE) return;
      writeIds([...ids, id]);
    },
    [ids, writeIds],
  );

  const handleRemoveCard = useCallback(
    (id: string) => {
      if (ids.length <= 2) return;
      writeIds(ids.filter((cardId) => cardId !== id));
    },
    [ids, writeIds],
  );

  const handleAddRecommendedCard = useCallback(
    (id: string, replaceId?: string) => {
      if (ids.includes(id)) return;
      const fallbackReplaceId = ids.at(-1);
      const idToReplace = replaceId ?? fallbackReplaceId;
      const baseIds =
        ids.length >= MAX_COMPARE && idToReplace !== undefined
          ? ids.filter((cardId) => cardId !== idToReplace)
          : ids;
      writeIds([...baseIds, id]);
    },
    [ids, writeIds],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchCardCatalog({}, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        setCatalogCards(response.cards);
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        // soft-fail: comparator still renders without catalogCards
      });
    return () => {
      controller.abort();
    };
  }, []);

  const idsKey = ids.join(",");

  useEffect(() => {
    if (ids.length === 0) {
      setResults([]);
      return;
    }
    setResults(ids.map((id) => ({ status: "loading" as const, id })));

    const controller = new AbortController();
    const requestIds = [...ids];

    requestIds.forEach((id, i) => {
      fetchCardDetail(id, { signal: controller.signal })
        .then((result) => {
          if (controller.signal.aborted) return;
          setResults((prev) => {
            const next = [...prev];
            if (result.ok) {
              next[i] = { status: "ok", card: result.value };
            } else {
              next[i] = { status: "error", id, message: result.error.message };
            }
            return next;
          });
        })
        .catch((error: unknown) => {
          if (isAbortError(error)) return;
          setResults((prev) => {
            const next = [...prev];
            next[i] = { status: "error", id, message: "Falha ao carregar o cartão." };
            return next;
          });
        });
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const loadedCards = useMemo(
    () =>
      results.reduce<PublicCardDetail[]>((cards, result) => {
        if (result.status === "ok") cards.push(result.card);
        return cards;
      }, []),
    [results],
  );

  const hasAnyLoading = results.some((r) => r.status === "loading");

  const compareMeta = (
    <PageMeta
      title="Comparar cartões — Vértice"
      description="Compare até 4 cartões lado a lado: anuidade, programa, cashback, sala VIP, IOF e seguros."
      noindex
    />
  );

  if (ids.length === 0) {
    return (
      <>
        {compareMeta}
        <CompareEmpty />
      </>
    );
  }

  return (
    <RevealGroup className="mx-auto max-w-6xl px-4 py-8">
      {compareMeta}
      <RevealBlock>
        <BackLink className="mb-4" to="/cards">
          Catálogo
        </BackLink>
        <h1 className="text-display-3 text-ink mb-1">Comparar Cartões</h1>

        {profile !== null ? (
          <p className="text-body-sm text-ink-muted mb-4 flex flex-wrap items-center gap-1.5">
            <span>
              {ids.length} {ids.length === 1 ? "cartão" : "cartões"} em comparação
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
            {ids.length} {ids.length === 1 ? "cartão" : "cartões"} em comparação
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
          {ids.map((id) => (
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
