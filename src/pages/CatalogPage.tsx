import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";
import {
  type CatalogCounts,
  CatalogFilterBar,
  type CatalogSort,
} from "@/features/catalog/CatalogFilters";
import { CatalogList } from "@/features/catalog/CatalogList";
import { fetchCardCatalog } from "@/lib/api";
import { useCompareStore } from "@/lib/compare-store";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/routes";
import type { CatalogFilters, CatalogRelationshipFilter, PublicCatalogCard } from "@/types";

const FILTER_QUERY_KEYS = [
  "search",
  "bank",
  "brand",
  "tier",
  "hasLounge",
  "hasCashback",
  "hasInvestback",
  "requiresRelationship",
  "minAnnualFee",
  "maxAnnualFee",
];

// Contagens estáticas sobre o catálogo inteiro, mostradas ao lado de cada
// filtro de checkbox. Não é facet (não considera os outros filtros ativos).
const computeCounts = (cards: PublicCatalogCard[]): CatalogCounts => ({
  hasLounge: cards.filter((c) => c.hasLoungeAccess).length,
  hasCashback: cards.filter(
    (c) =>
      c.cashbackRatePercent !== undefined && c.cashbackRatePercent > 0 && c.hasInvestback !== true,
  ).length,
  hasInvestback: cards.filter((c) => c.hasInvestback === true).length,
  requiresRelationship: {
    open: cards.filter((c) => (c.requiresRelationship ?? "open") === "open").length,
    checking: cards.filter((c) => c.requiresRelationship === "checking").length,
    investment: cards.filter((c) => c.requiresRelationship === "investment").length,
  },
});

const RELATIONSHIP_VALUES: CatalogRelationshipFilter[] = ["open", "checking", "investment"];
const DEFAULT_SORT: CatalogSort = "fee_asc";
const SORT_VALUES: CatalogSort[] = ["fee_asc", "fee_desc", "name_asc"];

const catalogSortFromSearchParams = (searchParams: URLSearchParams): CatalogSort => {
  const value = searchParams.get("sort");
  return SORT_VALUES.some((candidate) => candidate === value)
    ? (value as CatalogSort)
    : DEFAULT_SORT;
};

const parseNumberParam = (value: string | null): number | undefined => {
  if (value === null || value.length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseBooleanParam = (value: string | null): boolean | undefined => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const parseRelationshipParam = (value: string | null): CatalogRelationshipFilter[] | undefined => {
  if (value === null || value.length === 0) return undefined;
  const parsed = value
    .split(",")
    .filter((candidate): candidate is CatalogRelationshipFilter =>
      RELATIONSHIP_VALUES.includes(candidate as CatalogRelationshipFilter),
    );
  return parsed.length > 0 ? parsed : undefined;
};

const catalogFiltersFromSearchParams = (searchParams: URLSearchParams): CatalogFilters => {
  const filters: CatalogFilters = {};
  const search = searchParams.get("search");
  const bank = searchParams.get("bank");
  const brand = searchParams.get("brand");
  const tier = searchParams.get("tier");
  const hasLounge = parseBooleanParam(searchParams.get("hasLounge"));
  const hasCashback = parseBooleanParam(searchParams.get("hasCashback"));
  const hasInvestback = parseBooleanParam(searchParams.get("hasInvestback"));
  const requiresRelationship = parseRelationshipParam(searchParams.get("requiresRelationship"));
  const minAnnualFee = parseNumberParam(searchParams.get("minAnnualFee"));
  const maxAnnualFee = parseNumberParam(searchParams.get("maxAnnualFee"));

  if (search !== null && search.length > 0) filters.search = search;
  if (bank !== null && bank.length > 0) filters.bank = bank;
  if (brand !== null && brand.length > 0) filters.brand = brand;
  if (tier !== null && tier.length > 0) filters.tier = tier;
  if (hasLounge !== undefined) filters.hasLounge = hasLounge;
  if (hasCashback !== undefined) filters.hasCashback = hasCashback;
  if (hasInvestback !== undefined) filters.hasInvestback = hasInvestback;
  if (requiresRelationship !== undefined) filters.requiresRelationship = requiresRelationship;
  if (minAnnualFee !== undefined) filters.minAnnualFee = minAnnualFee;
  if (maxAnnualFee !== undefined) filters.maxAnnualFee = maxAnnualFee;
  return filters;
};

const catalogSearchParamsFromFilters = (
  current: URLSearchParams,
  filters: CatalogFilters,
): URLSearchParams => {
  const next = new URLSearchParams(current);
  FILTER_QUERY_KEYS.forEach((key) => {
    next.delete(key);
  });
  if (filters.search !== undefined && filters.search.length > 0) next.set("search", filters.search);
  if (filters.bank !== undefined && filters.bank.length > 0) next.set("bank", filters.bank);
  if (filters.brand !== undefined && filters.brand.length > 0) next.set("brand", filters.brand);
  if (filters.tier !== undefined && filters.tier.length > 0) next.set("tier", filters.tier);
  if (filters.hasLounge !== undefined) next.set("hasLounge", String(filters.hasLounge));
  if (filters.hasCashback !== undefined) next.set("hasCashback", String(filters.hasCashback));
  if (filters.hasInvestback !== undefined) next.set("hasInvestback", String(filters.hasInvestback));
  if (filters.requiresRelationship !== undefined && filters.requiresRelationship.length > 0) {
    next.set("requiresRelationship", filters.requiresRelationship.join(","));
  }
  if (filters.minAnnualFee !== undefined) next.set("minAnnualFee", String(filters.minAnnualFee));
  if (filters.maxAnnualFee !== undefined) next.set("maxAnnualFee", String(filters.maxAnnualFee));
  return next;
};

const CatalogSearch = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): JSX.Element => (
  <div className="relative w-full sm:w-72">
    <Search
      size={16}
      aria-hidden="true"
      className="text-ink-subtle pointer-events-none absolute top-1/2 left-0 -translate-y-1/2"
    />
    <input
      type="search"
      aria-label="Buscar"
      placeholder="Buscar por nome ou banco"
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      className="border-line text-ink placeholder:text-ink-subtle focus:border-ink/40 w-full border-0 border-b bg-transparent py-1.5 pr-1 pl-7 text-sm transition-colors outline-none"
    />
  </div>
);

export const CatalogPage = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => catalogFiltersFromSearchParams(searchParams), [searchParams]);
  const sort = catalogSortFromSearchParams(searchParams);
  const { ids } = useCompareStore();
  const [meta, setMeta] = useState<{ total: number; counts: CatalogCounts }>();
  const [resultCount, setResultCount] = useState<number>();

  // Sticky filter bar: a 1px sentinel right where the bar normally sits tells
  // us when the bar has scrolled to the top. `scrolledPast` gates out the
  // first frame (useInView reports false before the observer fires) so the bar
  // doesn't flash its "stuck" styling on load.
  const stickySentinelRef = useRef<HTMLDivElement | null>(null);
  const sentinelInView = useInView(stickySentinelRef);
  const [scrolledPast, setScrolledPast] = useState(false);
  useEffect(() => {
    if (sentinelInView) setScrolledPast(true);
  }, [sentinelInView]);
  const stuck = scrolledPast && !sentinelInView;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    void fetchCardCatalog({})
      .then((res) => {
        if (!cancelled) setMeta({ total: res.cards.length, counts: computeCounts(res.cards) });
      })
      .catch(() => {
        /* contagens são opcionais; se falhar, a barra renderiza sem elas */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFiltersChange = useCallback(
    (next: CatalogFilters) => {
      setSearchParams((current) => catalogSearchParamsFromFilters(current, next));
    },
    [setSearchParams],
  );

  const handleClear = useCallback(() => {
    setSearchParams((current) => catalogSearchParamsFromFilters(current, {}));
  }, [setSearchParams]);

  const handleSortChange = useCallback(
    (next: CatalogSort) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current);
        params.set("sort", next);
        return params;
      });
    },
    [setSearchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      const next: CatalogFilters = { ...filters };
      if (value.length > 0) next.search = value;
      else delete next.search;
      handleFiltersChange(next);
    },
    [filters, handleFiltersChange],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div ref={stickySentinelRef} aria-hidden="true" className="h-px" />

      {/* Contagem, busca e filtros ficam sticky juntos: o usuário pode
          adicionar/remover filtros sem voltar ao topo. */}
      <div className="sticky top-0 z-30">
        <motion.div
          initial={false}
          animate={{
            backgroundColor: stuck ? "rgba(248, 247, 242, 0.92)" : "rgba(248, 247, 242, 0)",
            boxShadow: stuck
              ? "0 14px 32px -22px rgba(31, 42, 36, 0.32)"
              : "0 0 0 0 rgba(31, 42, 36, 0)",
            padding: stuck ? "16px " : "0px",
          }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
          className="border-line border-b backdrop-blur-md"
        >
          <header className="border-line flex flex-col gap-3 border-b py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <h1 className="text-display-3 text-ink">
              {meta !== undefined && resultCount !== undefined ? (
                <>
                  <span className="tabular">{resultCount}</span>{" "}
                  <span className="font-normal italic">de</span>{" "}
                  <span className="tabular">{meta.total}</span>{" "}
                  <span className="font-normal italic">cartões</span>
                </>
              ) : (
                "Catálogo de cartões"
              )}
            </h1>
            <div className="flex items-center gap-3 sm:shrink-0">
              {ids.length > 0 && (
                <ButtonLink
                  to={`${ROUTES.COMPARE}?ids=${ids.join(",")}`}
                  variant="secondary"
                  size="sm"
                >
                  Comparar ({ids.length})
                </ButtonLink>
              )}
              <CatalogSearch value={filters.search ?? ""} onChange={handleSearchChange} />
            </div>
          </header>
          <div className="py-4">
            <CatalogFilterBar
              filters={filters}
              {...(meta !== undefined ? { counts: meta.counts } : {})}
              sort={sort}
              onChange={handleFiltersChange}
              onSortChange={handleSortChange}
              onClear={handleClear}
            />
          </div>
        </motion.div>
      </div>

      <div className="pt-6">
        <CatalogList
          filters={filters}
          onClearFilters={handleClear}
          sort={sort}
          onResultCount={setResultCount}
        />
      </div>
    </div>
  );
};
