import {
  type ChangeEvent,
  type JSX,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { BUTTON_BASE, BUTTON_SIZE, BUTTON_VARIANT } from "@/components/ui/button-styles";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { formatBankLabel } from "@/lib/labels";
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
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const inputId = `${listboxId}-input`;

  const results = useMemo(() => {
    return cards.filter((card) => matchesQuery(card, query)).slice(0, 8);
  }, [cards, query]);

  // Keep highlighted index inside the visible range after the result list shrinks.
  useEffect(() => {
    if (highlighted > results.length - 1) {
      setHighlighted(Math.max(0, results.length - 1));
    }
  }, [results.length, highlighted]);

  // Scroll the highlighted option into view (only when navigating with keys).
  useEffect(() => {
    if (!open) return;
    const highlightedCard = results[highlighted];
    if (highlightedCard === undefined) return;
    const node = listboxRef.current?.querySelector<HTMLElement>(
      `[data-option-id="${highlightedCard.id}"]`,
    );
    // jsdom does not implement scrollIntoView; guard so tests stay clean.
    if (node !== null && node !== undefined && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ block: "nearest" });
    }
  }, [open, highlighted, results]);

  const handleSelect = (id: string): void => {
    onSelect(id);
    setQuery("");
    setHighlighted(0);
    setOpen(false);
  };

  const focusInputAfterOpen = (): void => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length === 0) return;
      setHighlighted((current) => (current + 1) % results.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      setHighlighted((current) => (current - 1 + results.length) % results.length);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setHighlighted(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setHighlighted(Math.max(0, results.length - 1));
      return;
    }
    if (event.key === "Enter") {
      const target = results[highlighted];
      if (target === undefined) return;
      event.preventDefault();
      handleSelect(target.id);
    }
  };

  const highlightedCard = results[highlighted];
  const activeDescendantId =
    open && highlightedCard !== undefined ? `${listboxId}-${highlightedCard.id}` : undefined;

  return (
    <div className="relative flex flex-col gap-2">
      <button
        type="button"
        disabled={disabled}
        aria-disabled={disabled ? "true" : undefined}
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-haspopup="listbox"
        title={disabled ? "Máximo 4 cartões" : undefined}
        className={cn(BUTTON_BASE, BUTTON_SIZE.sm, BUTTON_VARIANT.secondary)}
        onClick={() => {
          setOpen((current) => {
            const next = !current;
            if (next) focusInputAfterOpen();
            return next;
          });
        }}
      >
        Adicionar cartão
      </button>
      {open && !disabled ? (
        <div className="border-line bg-surface-raised absolute top-full left-0 z-20 mt-2 w-72 rounded-lg border p-2 shadow-lg">
          <Input
            ref={inputRef}
            id={inputId}
            type="search"
            role="combobox"
            aria-label="Buscar cartão para comparar"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            {...(activeDescendantId !== undefined
              ? { "aria-activedescendant": activeDescendantId }
              : {})}
            value={query}
            placeholder="Buscar cartão…"
            onKeyDown={handleInputKeyDown}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setQuery(event.target.value);
              setHighlighted(0);
            }}
          />
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            className="mt-2 max-h-64 overflow-y-auto"
          >
            {results.map((card, index) => {
              const isHighlighted = index === highlighted;
              const isSelected = selectedIds.includes(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  id={`${listboxId}-${card.id}`}
                  data-option-id={card.id}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  className={cn(
                    "focus-visible:ring-accent flex w-full flex-col rounded-md p-2 text-left transition-colors outline-none focus-visible:ring-2",
                    isHighlighted ? "bg-surface-sunken" : "hover:bg-surface-sunken",
                  )}
                  onMouseEnter={() => {
                    setHighlighted(index);
                  }}
                  onClick={() => {
                    handleSelect(card.id);
                  }}
                >
                  <span className="text-body-sm text-ink font-semibold">{card.name}</span>
                  <span className="text-caption text-ink-subtle tracking-wide uppercase">
                    {formatBankLabel(card.bank, card.id)} · {card.tier}
                    {isSelected ? " · já na comparação" : ""}
                  </span>
                </button>
              );
            })}
            {results.length === 0 && query.length > 0 ? (
              <p className="text-body-sm text-ink-subtle px-2 py-3">Nenhum cartão encontrado.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
