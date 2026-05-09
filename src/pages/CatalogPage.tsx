import { type JSX, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { CatalogFiltersPanel } from "@/features/catalog/CatalogFilters";
import { CatalogList } from "@/features/catalog/CatalogList";
import { useCompareStore } from "@/lib/compare-store";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/routes";
import type { CatalogFilters } from "@/types";

const EMPTY_FILTERS: CatalogFilters = {};

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

const catalogFiltersFromSearchParams = (searchParams: URLSearchParams): CatalogFilters => {
  const filters: CatalogFilters = {};
  const hasLounge = parseBooleanParam(searchParams.get("hasLounge"));
  const maxAnnualFee = parseNumberParam(searchParams.get("maxAnnualFee"));
  if (hasLounge !== undefined) filters.hasLounge = hasLounge;
  if (maxAnnualFee !== undefined) filters.maxAnnualFee = maxAnnualFee;
  return filters;
};

const catalogSearchParamsFromFilters = (
  current: URLSearchParams,
  filters: CatalogFilters,
): URLSearchParams => {
  const next = new URLSearchParams(current);
  next.delete("hasLounge");
  next.delete("maxAnnualFee");
  if (filters.hasLounge !== undefined) next.set("hasLounge", String(filters.hasLounge));
  if (filters.maxAnnualFee !== undefined) next.set("maxAnnualFee", String(filters.maxAnnualFee));
  return next;
};

export const CatalogPage = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<CatalogFilters>(() =>
    catalogFiltersFromSearchParams(searchParams),
  );
  const { ids } = useCompareStore();

  useEffect(() => {
    setFilters(catalogFiltersFromSearchParams(searchParams));
  }, [searchParams]);

  const handleFiltersChange = useCallback(
    (nextFilters: CatalogFilters) => {
      setFilters(nextFilters);
      setSearchParams((current) => catalogSearchParamsFromFilters(current, nextFilters));
    },
    [setSearchParams],
  );

  const handleClear = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSearchParams((current) => catalogSearchParamsFromFilters(current, EMPTY_FILTERS));
  }, [setSearchParams]);

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
          />
        </div>
        <div className="min-w-0 flex-1">
          <CatalogList filters={filters} onClearFilters={handleClear} />
        </div>
      </div>
    </div>
  );
};
