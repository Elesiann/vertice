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
  | { status: "ok"; cards: PublicCatalogCard[]; total: number };

const SKELETON_COUNT = 9;

export const CatalogList = ({ filters, onClearFilters }: CatalogListProps): JSX.Element => {
  const [state, setState] = useState<State>({ status: "loading" });
  const { add, remove, has } = useCompareStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (f: CatalogFilters) => {
    setState({ status: "loading" });
    try {
      const hasFilters = Object.values(f).some((value) => value !== undefined);
      const [res, totalRes] = await Promise.all([
        fetchCardCatalog(f),
        hasFilters ? fetchCardCatalog({}) : Promise.resolve(null),
      ]);
      setState({
        status: "ok",
        cards: res.cards,
        total: totalRes?.cards.length ?? res.cards.length,
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

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body-sm text-ink-muted">
          {/* TODO: lint stackr-writing */}Carregando catálogo…
        </p>
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Carregando cartões"
        >
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="bg-surface-sunken h-64 animate-pulse rounded-xl" />
          ))}
        </div>
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

  const hasActiveFilters = Object.values(filters).some((value) => value !== undefined);
  const countSummary = `Mostrando ${String(state.cards.length)} de ${String(state.total)} cartões`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-ink-muted">{countSummary}</p>
        {hasActiveFilters && onClearFilters !== undefined ? (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        ) : null}
      </div>
      {state.cards.length === 0 ? (
        <Panel tone="sunken" className="p-6 text-center">
          <p className="text-body text-ink-muted">Nenhum cartão atende esses filtros.</p>
        </Panel>
      ) : (
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
      )}
    </div>
  );
};
