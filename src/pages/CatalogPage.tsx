import { type JSX, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUp, Search } from "lucide-react";
import {
  type CatalogCounts,
  CatalogFilterBar,
  type CatalogSort,
  type CatalogViewMode,
} from "@/features/catalog/CatalogFilters";
import { CatalogList } from "@/features/catalog/CatalogList";
import { BackLink } from "@/components/ui/BackLink";
import { fetchCardCatalog } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useCompareActions } from "@/features/compare/useCompareActions";
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
const VIEW_MODE_VALUES: CatalogViewMode[] = ["grid", "list"];
const BACK_TO_TOP_SCROLL_THRESHOLD = 480;

const catalogSortFromSearchParams = (searchParams: URLSearchParams): CatalogSort => {
  const value = searchParams.get("sort");
  return SORT_VALUES.some((candidate) => candidate === value)
    ? (value as CatalogSort)
    : DEFAULT_SORT;
};

const catalogViewModeFromSearchParams = (searchParams: URLSearchParams): CatalogViewMode => {
  const value = searchParams.get("view");
  return VIEW_MODE_VALUES.some((candidate) => candidate === value)
    ? (value as CatalogViewMode)
    : "grid";
};

const catalogFilterSearchKey = (searchParams: URLSearchParams): string => {
  const params = new URLSearchParams();
  FILTER_QUERY_KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value !== null) params.set(key, value);
  });
  return params.toString();
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
  const filterSearchKey = catalogFilterSearchKey(searchParams);
  const filters = useMemo(
    () => catalogFiltersFromSearchParams(new URLSearchParams(filterSearchKey)),
    [filterSearchKey],
  );
  const sort = catalogSortFromSearchParams(searchParams);
  const viewMode = catalogViewModeFromSearchParams(searchParams);
  const { count } = useCompareActions();
  const [meta, setMeta] = useState<{ total: number; counts: CatalogCounts }>();
  const [resultCount, setResultCount] = useState<number>();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const hasCompareSelection = count > 0;

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

  const handleViewModeChange = useCallback(
    (next: CatalogViewMode) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current);
        if (next === "grid") params.delete("view");
        else params.set("view", next);
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

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > BACK_TO_TOP_SCROLL_THRESHOLD);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleBackToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <BackLink className="mb-4" to="/">
        Home
      </BackLink>
      <div className="border-line border-b">
        <header className="border-line flex flex-col gap-3 border-b py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <h1 className="text-display-3 text-ink">
            {meta !== undefined && resultCount !== undefined ? (
              <>
                <span className="tabular">{resultCount}</span> <span className="tabular">de</span>{" "}
                <span className="tabular">{meta.total}</span>{" "}
                <span className="tabular">cartões</span>
              </>
            ) : (
              "Catálogo de cartões"
            )}
          </h1>
          <div className="flex items-center gap-3 sm:shrink-0">
            <CatalogSearch value={filters.search ?? ""} onChange={handleSearchChange} />
          </div>
        </header>
        <div className="py-4">
          <CatalogFilterBar
            filters={filters}
            {...(meta !== undefined ? { counts: meta.counts } : {})}
            sort={sort}
            viewMode={viewMode}
            onChange={handleFiltersChange}
            onSortChange={handleSortChange}
            onViewModeChange={handleViewModeChange}
            onClear={handleClear}
          />
        </div>
      </div>

      <div className="pt-6">
        <CatalogList
          filters={filters}
          onClearFilters={handleClear}
          sort={sort}
          viewMode={viewMode}
          onResultCount={setResultCount}
        />
      </div>

      {showBackToTop && (
        <Button
          type="button"
          variant="secondary"
          size="md"
          ariaLabel="Voltar ao topo"
          className={cn(
            "fixed right-[calc(1.5rem+env(safe-area-inset-right))] z-40 size-12 rounded-full px-0 shadow-md",
            hasCompareSelection
              ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
              : "bottom-[calc(1.5rem+env(safe-area-inset-bottom))]",
          )}
          onClick={handleBackToTop}
        >
          <ArrowUp size={20} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
};
