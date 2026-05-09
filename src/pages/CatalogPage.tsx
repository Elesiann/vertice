import { type JSX, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { CatalogFiltersPanel, type CatalogSort } from "@/features/catalog/CatalogFilters";
import { CatalogList } from "@/features/catalog/CatalogList";
import { useCompareStore } from "@/lib/compare-store";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/routes";
import type { CatalogFilters } from "@/types";

const EMPTY_FILTERS: CatalogFilters = {};
const DEFAULT_SORT: CatalogSort = "fee_asc";
const SORT_VALUES: CatalogSort[] = ["fee_asc", "fee_desc", "name_asc"];

const catalogSortFromSearchParams = (searchParams: URLSearchParams): CatalogSort => {
  const value = searchParams.get("sort");
  return SORT_VALUES.some((candidate) => candidate === value)
    ? (value as CatalogSort)
    : DEFAULT_SORT;
};

export const CatalogPage = (): JSX.Element => {
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = catalogSortFromSearchParams(searchParams);
  const { ids } = useCompareStore();
  const handleClear = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

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
            onChange={setFilters}
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
