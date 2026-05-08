import { type JSX, useCallback, useEffect, useRef, useState } from "react";
import { fetchCardCatalog } from "@/lib/api";
import { useCompareStore } from "@/lib/compare-store";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { CatalogCard } from "./CatalogCard";
import type { CatalogFilters, PublicCatalogCard } from "@/types";

interface CatalogListProps {
  filters: CatalogFilters;
  onClearFilters?: () => void;
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; cards: PublicCatalogCard[] };

const SKELETON_COUNT = 9;

export const CatalogList = ({ filters, onClearFilters }: CatalogListProps): JSX.Element => {
  const [state, setState] = useState<State>({ status: "loading" });
  const { add, remove, has } = useCompareStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (f: CatalogFilters) => {
    setState({ status: "loading" });
    try {
      const res = await fetchCardCatalog(f);
      setState({ status: "ok", cards: res.cards });
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

  if (state.status === "loading") {
    return (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy="true"
        aria-label="Carregando cartões"
      >
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div key={i} className="bg-surface-sunken h-64 animate-pulse rounded-xl" />
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
        <p className="text-body text-ink-muted">Nenhum cartão atende esses filtros.</p>
        {onClearFilters !== undefined && (
          <Button variant="ghost" size="sm" className="mt-4" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        )}
      </Panel>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {state.cards.map((card) => (
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
  );
};
