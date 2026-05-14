import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/cn";
import { formatBankLabel } from "@/lib/labels";
import type { CardOption } from "@/types";

interface CardComboboxProps {
  options: CardOption[];
  value: string[];
  onChange: (next: string[]) => void;
  loading?: boolean;
  error?: boolean;
  id?: string;
}

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

export const CardCombobox = ({
  options,
  value,
  onChange,
  loading = false,
  error = false,
  id,
}: CardComboboxProps): JSX.Element => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const finalId = id ?? `${listboxId}-input`;

  const selectedSet = useMemo(() => new Set(value), [value]);

  const selectedOptions = useMemo(
    () =>
      value.reduce<CardOption[]>((acc, cardId) => {
        const found = options.find((o) => o.id === cardId);
        if (found !== undefined) acc.push(found);
        return acc;
      }, []),
    [value, options],
  );

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    if (q === "") return options;
    return options.filter((c) => normalize(c.name).includes(q) || normalize(c.bank).includes(q));
  }, [options, search]);

  useEffect(() => {
    if (highlighted >= filtered.length) {
      setHighlighted(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, highlighted]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  const toggle = useCallback(
    (cardId: string): void => {
      if (selectedSet.has(cardId)) {
        onChange(value.filter((v) => v !== cardId));
      } else {
        onChange([...value, cardId]);
      }
    },
    [onChange, selectedSet, value],
  );

  const remove = useCallback(
    (cardId: string): void => {
      onChange(value.filter((v) => v !== cardId));
    },
    [onChange, value],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlighted((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      if (open && filtered[highlighted] !== undefined) {
        e.preventDefault();
        toggle(filtered[highlighted].id);
      } else if (!open) {
        e.preventDefault();
        setOpen(true);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === "Backspace" && search === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const showEmptyState = !loading && !error && filtered.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "border-line bg-surface-raised flex flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 transition",
          "focus-within:border-accent focus-within:ring-accent/20 focus-within:ring-2",
        )}
        onClick={() => inputRef.current?.focus()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.focus();
        }}
        role="button"
        tabIndex={-1}
      >
        {selectedOptions.map((card) => (
          <span
            key={card.id}
            className="bg-surface-sunken text-ink border-line/60 inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium"
          >
            <span className="max-w-[28ch] truncate">{card.name}</span>
            <button
              type="button"
              aria-label={`Remover ${card.name}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(card.id);
              }}
              className="text-ink-subtle hover:text-danger focus-visible:ring-accent -mr-0.5 grid size-4 place-items-center rounded-sm transition focus-visible:ring-2 focus-visible:outline-none"
            >
              <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
                <path
                  d="M2 2 L10 10 M10 2 L2 10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={finalId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && filtered[highlighted] !== undefined
              ? `${listboxId}-${filtered[highlighted].id}`
              : undefined
          }
          autoComplete="off"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => {
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={selectedOptions.length === 0 ? "Buscar por nome ou banco" : ""}
          className="text-ink placeholder:text-ink-subtle min-w-[10ch] flex-1 bg-transparent p-1 text-sm outline-none"
        />
      </div>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          className="border-line bg-surface-raised absolute bottom-full z-20 mb-1 max-h-64 w-full overflow-y-auto rounded-lg border shadow-lg"
        >
          {loading ? (
            <p className="text-ink-subtle px-3 py-2 text-sm">Carregando cartões…</p>
          ) : null}
          {error ? (
            <p className="text-danger bg-danger-soft px-3 py-2 text-sm">
              Não foi possível carregar a lista de cartões.
            </p>
          ) : null}
          {showEmptyState ? (
            <p className="text-ink-subtle px-3 py-2 text-sm">Nenhum cartão encontrado.</p>
          ) : null}
          {filtered.map((card, idx) => {
            const isSelected = selectedSet.has(card.id);
            const isHighlighted = idx === highlighted;
            return (
              <div
                key={card.id}
                id={`${listboxId}-${card.id}`}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggle(card.id);
                }}
                onMouseEnter={() => {
                  setHighlighted(idx);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition",
                  isHighlighted ? "bg-surface-sunken" : "",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "border-line inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition",
                    isSelected ? "border-accent bg-accent" : "bg-surface",
                  )}
                >
                  {isSelected ? (
                    <svg viewBox="0 0 16 16" className="size-3 text-white">
                      <path
                        d="M3 8 L6.5 11.5 L13 4.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-ink">{card.name}</span>{" "}
                  <span className="text-ink-subtle">({formatBankLabel(card.bank, card.id)})</span>
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
