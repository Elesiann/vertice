import { type JSX, useCallback, useEffect, useRef, useState } from "react";
import { fetchCardCatalog } from "@/lib/api";
import { useCompareStore } from "@/lib/compare-store";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { CatalogCard } from "./CatalogCard";
import type { CatalogSort } from "./CatalogFilters";
import type { CatalogFilters, PublicCatalogCard } from "@/types";

interface CatalogListProps {
  filters: CatalogFilters;
  onClearFilters?: () => void;
  sort?: CatalogSort;
  /** Called with the card count after each successful fetch (post client-side search). */
  onResultCount?: (count: number) => void;
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; cards: PublicCatalogCard[] };

const SKELETON_COUNT = 8;
const DEFAULT_SORT: CatalogSort = "fee_asc";
// Renderiza incrementalmente: o catálogo inteiro vem numa requisição (a API
// não pagina), mas só montamos PAGE_SIZE cards por vez e um sentinela no fim
// do grid revela mais conforme o usuário rola.
const PAGE_SIZE = 30;

// Sem sidebar, o grid usa a largura inteira: 4 colunas no desktop largo.
const GRID = "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

const searchTerms = (search: string | undefined): string[] =>
  (search ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

const matchesSearchTerms = (card: PublicCatalogCard, terms: string[]): boolean => {
  if (terms.length <= 1) return true;
  const fields = [card.name, card.bank, card.tier, card.brand].map((field) => field.toLowerCase());
  return terms.every((term) => fields.some((field) => field.includes(term)));
};

const emptySuggestion = (filters: CatalogFilters): string => {
  if (filters.maxAnnualFee !== undefined && filters.maxAnnualFee <= 200) {
    return "Tente ampliar a anuidade até R$ 500.";
  }
  if (filters.hasLounge === true) {
    return "Tente sem o filtro de lounge.";
  }
  return "Tente ampliar a busca.";
};

const byName = (a: PublicCatalogCard, b: PublicCatalogCard): number =>
  a.name.localeCompare(b.name, "pt-BR");

const sortCatalogCards = (
  cards: readonly PublicCatalogCard[],
  sort: CatalogSort,
): PublicCatalogCard[] =>
  [...cards].sort((a, b) => {
    if (sort === "fee_desc") return b.annualFeeBrl - a.annualFeeBrl || byName(a, b);
    if (sort === "name_asc") return byName(a, b);
    return a.annualFeeBrl - b.annualFeeBrl || byName(a, b);
  });

export const CatalogList = ({
  filters,
  onClearFilters,
  sort = DEFAULT_SORT,
  onResultCount,
}: CatalogListProps): JSX.Element => {
  const [state, setState] = useState<State>({ status: "loading" });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { add, remove, has } = useCompareStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onResultCountRef = useRef(onResultCount);
  useEffect(() => {
    onResultCountRef.current = onResultCount;
  });

  const load = useCallback(async (f: CatalogFilters) => {
    setState({ status: "loading" });
    setVisibleCount(PAGE_SIZE);
    try {
      const terms = searchTerms(f.search);
      const { search: _search, ...filtersWithoutSearch } = f;
      const requestFilters = terms.length > 1 ? filtersWithoutSearch : f;
      const res = await fetchCardCatalog(requestFilters);
      const cards = res.cards.filter((card) => matchesSearchTerms(card, terms));
      setState({ status: "ok", cards });
      onResultCountRef.current?.(cards.length);
    } catch {
      setState({ status: "error", message: "Não foi possível carregar o catálogo." });
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void load(filters), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, load]);

  // Reordenar mostra de novo só a primeira página.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [sort]);

  const visibleCards =
    state.status === "ok" ? sortCatalogCards(state.cards, sort).slice(0, visibleCount) : [];
  const hasMore = state.status === "ok" && visibleCount < state.cards.length;

  useEffect(() => {
    if (!hasMore) return;
    if (typeof IntersectionObserver === "undefined") return;
    const node = sentinelRef.current;
    if (node === null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => count + PAGE_SIZE);
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, visibleCount]);

  if (state.status === "loading") {
    return (
      <div className={GRID} aria-busy="true" aria-label="Carregando cartões">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div key={i} className="bg-surface-sunken aspect-[3/4] animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <Panel tone="raised" className="p-6 text-center">
        <p className="text-body text-ink-muted">{state.message}</p>
        <Button className="mt-4" onClick={() => void load(filters)}>
          Tentar de novo
        </Button>
      </Panel>
    );
  }

  if (state.cards.length === 0) {
    return (
      <Panel tone="sunken" className="p-6 text-center">
        <p className="text-body text-ink-muted">Nenhum cartão com esses filtros.</p>
        <p className="text-body-sm text-ink-subtle mt-2">{emptySuggestion(filters)}</p>
        {onClearFilters !== undefined && (
          <Button variant="ghost" size="sm" className="mt-4" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        )}
      </Panel>
    );
  }

  return (
    <>
      <div className={`${GRID} items-start`}>
        {visibleCards.map((card) => (
          <CatalogCard
            key={card.id}
            card={card}
            inCompare={has(card.id)}
            onCompare={(id) => {
              if (has(id)) {
                remove(id);
              } else {
                add(id);
              }
            }}
          />
        ))}
      </div>
      {hasMore ? <div ref={sentinelRef} aria-hidden="true" className="h-1 w-full" /> : null}
    </>
  );
};
