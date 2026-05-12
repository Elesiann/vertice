import { type JSX, useCallback, useEffect, useRef, useState } from "react";
import { fetchCardCatalog } from "@/lib/api";
import { useCompareStore } from "@/lib/compare-store";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CatalogCard } from "./CatalogCard";
import type { CatalogSort } from "./CatalogFilters";
import type { CatalogFilters, PublicCatalogCard } from "@/types";

interface CatalogListProps {
  filters: CatalogFilters;
  onClearFilters?: () => void;
  sort?: CatalogSort;
  onSortChange?: (sort: CatalogSort) => void;
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; cards: PublicCatalogCard[]; total: number };

const SKELETON_COUNT = 9;
const DEFAULT_SORT: CatalogSort = "fee_asc";
// Renderiza incrementalmente: o catálogo inteiro vem numa requisição (a API
// não pagina), mas só montamos PAGE_SIZE cards por vez e um sentinela no fim
// do grid revela mais conforme o usuário rola.
const PAGE_SIZE = 30;

const SORT_LABEL: Record<CatalogSort, string> = {
  fee_asc: "Menor anuidade",
  fee_desc: "Maior anuidade",
  name_asc: "Nome (A–Z)",
};

const searchTerms = (search: string | undefined): string[] => {
  return (search ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);
};

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

const summaryText = (state: State): string => {
  if (state.status === "loading") return "Carregando catálogo…"; // TODO: lint stackr-writing
  if (state.status === "error") return "";
  return `Mostrando ${String(state.cards.length)} de ${String(state.total)} cartões`;
};

interface SortControlProps {
  sort: CatalogSort;
  onSortChange: (sort: CatalogSort) => void;
}

const SortControl = ({ sort, onSortChange }: SortControlProps): JSX.Element => (
  <div className="flex items-center gap-2">
    <span className="text-ink-muted text-sm whitespace-nowrap">Ordenar por</span>
    <div className="w-44">
      <Select
        aria-label="Ordenar por"
        value={sort}
        onChange={(e) => {
          onSortChange(e.target.value as CatalogSort);
        }}
      >
        {(Object.keys(SORT_LABEL) as CatalogSort[]).map((value) => (
          <option key={value} value={value}>
            {SORT_LABEL[value]}
          </option>
        ))}
      </Select>
    </div>
  </div>
);

export const CatalogList = ({
  filters,
  onClearFilters,
  sort = DEFAULT_SORT,
  onSortChange,
}: CatalogListProps): JSX.Element => {
  const [state, setState] = useState<State>({ status: "loading" });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { add, remove, has } = useCompareStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (f: CatalogFilters) => {
    setState({ status: "loading" });
    setVisibleCount(PAGE_SIZE);
    try {
      const terms = searchTerms(f.search);
      const { search: _search, ...filtersWithoutSearch } = f;
      const requestFilters = terms.length > 1 ? filtersWithoutSearch : f;
      const hasFilters = Object.values(f).some((value) => value !== undefined);
      const [res, totalRes] = await Promise.all([
        fetchCardCatalog(requestFilters),
        hasFilters ? fetchCardCatalog({}) : Promise.resolve(null),
      ]);
      const filteredCards = res.cards.filter((card) => matchesSearchTerms(card, terms));
      setState({
        status: "ok",
        cards: filteredCards,
        total: totalRes?.cards.length ?? filteredCards.length,
      });
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

  const hasActiveFilters = Object.values(filters).some((value) => value !== undefined);
  const showClear = hasActiveFilters && onClearFilters !== undefined && state.status !== "loading";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-ink-muted">{summaryText(state)}</p>
        <div className="flex flex-wrap items-center gap-3">
          {onSortChange !== undefined && <SortControl sort={sort} onSortChange={onSortChange} />}
          {showClear ? (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </div>

      {state.status === "loading" && (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Carregando cartões"
        >
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="bg-surface-sunken h-64 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <Panel tone="raised" className="p-6 text-center">
          <p className="text-body text-ink-muted">{state.message}</p>
          <Button className="mt-4" onClick={() => void load(filters)}>
            Tentar de novo
          </Button>
        </Panel>
      )}

      {state.status === "ok" && state.cards.length === 0 && (
        <Panel tone="sunken" className="p-6 text-center">
          <p className="text-body text-ink-muted">Nenhum cartão com esses filtros.</p>
          <p className="text-body-sm text-ink-subtle mt-2">{emptySuggestion(filters)}</p>
          {onClearFilters !== undefined && (
            <Button variant="ghost" size="sm" className="mt-4" onClick={onClearFilters}>
              Limpar filtros
            </Button>
          )}
        </Panel>
      )}

      {state.status === "ok" && state.cards.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      )}
    </div>
  );
};
