import { type JSX, useState, useCallback } from "react";
import { CatalogFiltersPanel } from "@/features/catalog/CatalogFilters";
import { CatalogList } from "@/features/catalog/CatalogList";
import { useCompareStore } from "@/lib/compare-store";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/routes";
import type { CatalogFilters } from "@/types";

const EMPTY_FILTERS: CatalogFilters = {};

export const CatalogPage = (): JSX.Element => {
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const { ids } = useCompareStore();
  const handleClear = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

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
