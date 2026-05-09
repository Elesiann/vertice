import { type JSX, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CatalogFiltersPanel } from "@/features/catalog/CatalogFilters";
import { CatalogList } from "@/features/catalog/CatalogList";
import { useCompareStore } from "@/lib/compare-store";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/routes";
import type { CatalogFilters } from "@/types";

const EMPTY_FILTERS: CatalogFilters = {};

const parseBoolean = (value: string | null): true | undefined => {
  return value === "true" ? true : undefined;
};

const parseNumber = (value: string | null): number | undefined => {
  if (value === null || value.length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const filtersFromSearchParams = (searchParams: URLSearchParams): CatalogFilters => {
  const next: CatalogFilters = {};
  const search = searchParams.get("search");
  const brand = searchParams.get("brand");
  const tier = searchParams.get("tier");
  const maxAnnualFee = parseNumber(searchParams.get("maxAnnualFee"));
  const hasLounge = parseBoolean(searchParams.get("hasLounge"));
  const hasCashback = parseBoolean(searchParams.get("hasCashback"));

  if (search !== null && search.length > 0) next.search = search;
  if (brand !== null && brand.length > 0) next.brand = brand;
  if (tier !== null && tier.length > 0) next.tier = tier;
  if (maxAnnualFee !== undefined) next.maxAnnualFee = maxAnnualFee;
  if (hasLounge !== undefined) next.hasLounge = hasLounge;
  if (hasCashback !== undefined) next.hasCashback = hasCashback;

  return next;
};

const searchParamsFromFilters = (filters: CatalogFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.search !== undefined && filters.search.length > 0)
    params.set("search", filters.search);
  if (filters.brand !== undefined && filters.brand.length > 0) params.set("brand", filters.brand);
  if (filters.tier !== undefined && filters.tier.length > 0) params.set("tier", filters.tier);
  if (filters.maxAnnualFee !== undefined) params.set("maxAnnualFee", String(filters.maxAnnualFee));
  if (filters.hasLounge !== undefined) params.set("hasLounge", String(filters.hasLounge));
  if (filters.hasCashback !== undefined) params.set("hasCashback", String(filters.hasCashback));
  return params;
};

const filtersKey = (filters: CatalogFilters): string => searchParamsFromFilters(filters).toString();

export const CatalogPage = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFiltersState] = useState<CatalogFilters>(() =>
    filtersFromSearchParams(searchParams),
  );
  const { ids } = useCompareStore();

  useEffect(() => {
    const next = filtersFromSearchParams(searchParams);
    if (filtersKey(next) !== filtersKey(filters)) {
      setFiltersState(next);
    }
  }, [filters, searchParams]);

  const setFilters = useCallback(
    (next: CatalogFilters) => {
      setFiltersState(next);
      setSearchParams(searchParamsFromFilters(next));
    },
    [setSearchParams],
  );

  const handleClear = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, [setFilters]);

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
          <CatalogFiltersPanel filters={filters} onChange={setFilters} onClear={handleClear} />
        </div>
        <div className="min-w-0 flex-1">
          <CatalogList filters={filters} onClearFilters={handleClear} />
        </div>
      </div>
    </div>
  );
};
