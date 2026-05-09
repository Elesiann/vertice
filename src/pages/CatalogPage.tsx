import { type JSX, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { CatalogFiltersPanel, type CatalogSort } from "@/features/catalog/CatalogFilters";
import { CatalogList } from "@/features/catalog/CatalogList";
import { useCompareStore } from "@/lib/compare-store";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/routes";
import type { CatalogFilters, CatalogRelationshipFilter } from "@/types";

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

export const CatalogPage = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => catalogFiltersFromSearchParams(searchParams), [searchParams]);
  const sort = catalogSortFromSearchParams(searchParams);
  const { ids } = useCompareStore();

  const handleFiltersChange = useCallback(
    (nextFilters: CatalogFilters) => {
      setSearchParams((current) => catalogSearchParamsFromFilters(current, nextFilters));
    },
    [setSearchParams],
  );

  const handleClear = useCallback(() => {
    setSearchParams((current) => catalogSearchParamsFromFilters(current, {}));
  }, [setSearchParams]);

  const handleSortChange = useCallback(
    (nextSort: CatalogSort) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("sort", nextSort);
        return next;
      });
    },
    [setSearchParams],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-display-3 text-ink">Catálogo de Cartões</h1>
        {ids.length > 0 && (
          <ButtonLink to={`${ROUTES.COMPARE}?ids=${ids.join(",")}`} variant="secondary" size="sm">
            Comparar ({ids.length})
          </ButtonLink>
        )}
      </header>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-56 lg:shrink-0">
          <CatalogFiltersPanel
            filters={filters}
            onChange={handleFiltersChange}
            onClear={handleClear}
            sort={sort}
            onSortChange={handleSortChange}
          />
        </div>
        <div className="min-w-0 flex-1">
          <CatalogList filters={filters} onClearFilters={handleClear} sort={sort} />
        </div>
      </div>
    </div>
  );
};
