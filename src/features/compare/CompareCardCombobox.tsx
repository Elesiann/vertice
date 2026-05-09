import { type ChangeEvent, type JSX, useMemo, useState } from "react";
import { BUTTON_BASE, BUTTON_SIZE, BUTTON_VARIANT } from "@/components/ui/button-styles";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { PublicCatalogCard } from "@/types";

interface CompareCardComboboxProps {
  cards: PublicCatalogCard[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const matchesQuery = (card: PublicCatalogCard, query: string): boolean => {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);
  if (terms.length === 0) return true;

  const haystack = `${card.name} ${card.bank}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
};

export const CompareCardCombobox = ({
  cards,
  selectedIds,
  onSelect,
  disabled = false,
}: CompareCardComboboxProps): JSX.Element => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    return cards.filter((card) => matchesQuery(card, query)).slice(0, 8);
  }, [cards, query]);

  const handleSelect = (id: string): void => {
    onSelect(id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative flex flex-col gap-2">
      <button
        type="button"
        disabled={disabled}
        aria-disabled={disabled ? "true" : undefined}
        title={disabled ? "Máximo 4 cartões" : undefined}
        className={cn(BUTTON_BASE, BUTTON_SIZE.sm, BUTTON_VARIANT.secondary)}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        Adicionar cartão
      </button>
      {open && !disabled ? (
        <div className="border-line bg-surface-raised absolute top-full left-0 z-20 mt-2 w-72 rounded-lg border p-2 shadow-lg">
          <Input
            type="search"
            value={query}
            placeholder="Buscar cartão…"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setQuery(event.target.value);
            }}
            autoFocus
          />
          <div className="mt-2 max-h-64 overflow-y-auto">
            {results.map((card) => (
              <button
                key={card.id}
                type="button"
                className="hover:bg-surface-sunken focus-visible:ring-accent flex w-full flex-col rounded-md px-2 py-2 text-left outline-none focus-visible:ring-2"
                onClick={() => {
                  handleSelect(card.id);
                }}
              >
                <span className="text-body-sm text-ink font-semibold">{card.name}</span>
                <span className="text-caption text-ink-subtle tracking-wide uppercase">
                  {card.bank} · {card.tier}
                  {selectedIds.includes(card.id) ? " · já na comparação" : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
