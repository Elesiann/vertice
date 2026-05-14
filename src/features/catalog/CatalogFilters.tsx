import {
  type ChangeEvent,
  type JSX,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Grid2X2,
  List,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { CatalogFilters, CatalogRelationshipFilter } from "@/types";

export type CatalogSort = "fee_asc" | "fee_desc" | "name_asc";
export type CatalogViewMode = "grid" | "list";

// Per-facet card counts over the whole catalog (a static estimate — not a true
// facet count that reacts to the other active filters). Shown next to each
// checkbox so the user knows roughly how many cards a filter would surface.
export interface CatalogCounts {
  hasLounge: number;
  hasCashback: number;
  hasInvestback: number;
  requiresRelationship: Partial<Record<CatalogRelationshipFilter, number>>;
}

interface CatalogFilterBarProps {
  filters: CatalogFilters;
  counts?: CatalogCounts;
  sort: CatalogSort;
  viewMode: CatalogViewMode;
  onChange: (filters: CatalogFilters) => void;
  onSortChange: (sort: CatalogSort) => void;
  onViewModeChange: (viewMode: CatalogViewMode) => void;
  onClear: () => void;
}

// Merge filters, dropping any key whose value is explicitly undefined or empty.
// Required because the project uses exactOptionalPropertyTypes.
type FilterUpdate = {
  [K in keyof CatalogFilters]?: CatalogFilters[K] | undefined;
};

const isEmptyFilterValue = (value: unknown): boolean =>
  value === undefined || (Array.isArray(value) && value.length === 0);

const mergeFilters = (base: CatalogFilters, update: FilterUpdate): CatalogFilters =>
  Object.fromEntries(
    Object.entries({ ...base, ...update }).filter(([, value]) => !isEmptyFilterValue(value)),
  );

const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: "fee_asc", label: "Menor anuidade" },
  { value: "fee_desc", label: "Maior anuidade" },
  { value: "name_asc", label: "Nome (A–Z)" },
];

const BRAND_OPTIONS = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "amex", label: "Amex" },
  { value: "elo", label: "Elo" },
  { value: "hipercard", label: "Hipercard" },
];

const TIER_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
  { value: "black", label: "Black" },
  { value: "infinite", label: "Infinite" },
];

const RELATIONSHIP_OPTIONS: { value: CatalogRelationshipFilter; label: string }[] = [
  { value: "open", label: "Sem relacionamento" },
  { value: "checking", label: "Conta corrente" },
  { value: "investment", label: "Investidor" },
];

const labelFor = (options: readonly { value: string; label: string }[], value: string): string =>
  options.find((option) => option.value === value)?.label ?? value;

const formatFeeBrl = (value: number): string => value.toLocaleString("pt-BR");

const feeChipLabel = (bound: "min" | "max", value: number): string => {
  if (bound === "max" && value === 0) return "Sem anuidade";
  return `Anuidade ${bound === "min" ? "≥" : "≤"} R$ ${formatFeeBrl(value)}`;
};

const parseFee = (value: string): number | undefined => {
  if (value.length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// Min/max annual-fee inputs with a debounce — typing shouldn't fire a request
// (and rewrite the URL) on every keystroke. Local state holds what the user is
// typing; it syncs up after they pause. Remounts whenever the popover reopens,
// so it re-seeds from the current filter values then.
const FeeRangeFields = ({
  min,
  max,
  onChange,
}: {
  min: number | undefined;
  max: number | undefined;
  onChange: (next: { min: number | undefined; max: number | undefined }) => void;
}): JSX.Element => {
  const [localMin, setLocalMin] = useState(() => (min !== undefined ? String(min) : ""));
  const [localMax, setLocalMax] = useState(() => (max !== undefined ? String(max) : ""));
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    setLocalMin(min !== undefined ? String(min) : "");
    setLocalMax(max !== undefined ? String(max) : "");
  }, [min, max]);
  useEffect(() => {
    const parsedMin = parseFee(localMin);
    const parsedMax = parseFee(localMax);
    if (parsedMin === min && parsedMax === max) return;
    const id = setTimeout(() => {
      onChangeRef.current({ min: parsedMin, max: parsedMax });
    }, 300);
    return () => {
      clearTimeout(id);
    };
  }, [localMin, localMax, min, max]);
  return (
    <div className="flex flex-col gap-2 p-1">
      <span className="text-caption text-ink-subtle">Faixa (R$ por ano)</span>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          min={0}
          placeholder="Mínima"
          aria-label="Anuidade mínima (R$)"
          value={localMin}
          onChange={(event) => {
            setLocalMin(event.target.value);
          }}
        />
        <Input
          type="number"
          min={0}
          placeholder="Máxima"
          aria-label="Anuidade máxima (R$)"
          value={localMax}
          onChange={(event) => {
            setLocalMax(event.target.value);
          }}
        />
      </div>
    </div>
  );
};

// --- pill styling -----------------------------------------------------------

const PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer";
const PILL_IDLE =
  "border-line bg-transparent text-ink-muted hover:border-line-strong hover:text-ink";
const PILL_ACTIVE = "border-ink bg-ink text-surface-raised hover:bg-ink/90";

const Divider = (): JSX.Element => (
  <span aria-hidden="true" className="bg-line mx-1 hidden h-5 w-px shrink-0 sm:block" />
);

const MOBILE_TOOLBAR_BUTTON =
  "border-line text-ink-muted bg-transparent hover:border-line-strong hover:text-ink focus-visible:ring-accent inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

// --- dropdown ---------------------------------------------------------------

interface DropdownApi {
  close: () => void;
}

interface FilterDropdownProps {
  /** Pill text. */
  label: string;
  /** Whether the pill renders in the filled "active" state. */
  active: boolean;
  /** Accessible label for the popover region. */
  panelLabel: string;
  /** Extra classes for the popover panel (e.g. a fixed width). */
  panelClassName?: string;
  children: ReactNode | ((api: DropdownApi) => ReactNode);
}

const FilterDropdown = ({
  label,
  active,
  panelLabel,
  panelClassName,
  children,
}: FilterDropdownProps): JSX.Element => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent): void => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onBlur={(event) => {
        // null relatedTarget means a non-focusable element was clicked (e.g. a
        // <label>); the document mousedown listener handles outside clicks, so
        // keep open here. For keyboard tab-out, relatedTarget is the next element.
        if (event.relatedTarget === null) return;
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          setOpen((value) => !value);
        }}
        className={cn(
          PILL_BASE,
          active ? PILL_ACTIVE : PILL_IDLE,
          active ? "focus-visible:ring-ink/30" : "focus-visible:ring-accent/30",
        )}
      >
        <span>{label}</span>
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={cn("shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={panelLabel}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          className={cn(
            "border-line bg-surface-raised absolute top-[calc(100%+0.5rem)] left-0 z-40 flex min-w-[13rem] flex-col gap-0.5 rounded-lg border p-2 shadow-lg",
            panelClassName,
          )}
        >
          {typeof children === "function"
            ? children({
                close: () => {
                  setOpen(false);
                },
              })
            : children}
        </div>
      )}
    </div>
  );
};

// --- popover rows -----------------------------------------------------------

// Radio-like row for single-select dropdowns (bandeira, categoria, ordenação).
const OptionRow = ({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}): JSX.Element => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onSelect}
    className={cn(
      "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
      selected
        ? "bg-surface-sunken text-ink font-medium"
        : "text-ink-muted hover:bg-surface-sunken/60 hover:text-ink",
    )}
  >
    <Check
      size={13}
      aria-hidden="true"
      className={cn("text-accent shrink-0", !selected && "invisible")}
    />
    <span>{label}</span>
  </button>
);

// Checkbox row for multi-select dropdowns. The count sits *outside* the
// <label> so the input's accessible name stays exactly the label text.
const CheckRow = ({
  label,
  checked,
  count,
  onChange,
}: {
  label: string;
  checked: boolean;
  count?: number | undefined;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}): JSX.Element => (
  <div className="hover:bg-surface-sunken/60 flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 transition-colors">
    <label className="text-ink-muted flex cursor-pointer items-center gap-2.5 text-sm">
      <Checkbox checked={checked} onChange={onChange} />
      {label}
    </label>
    {count !== undefined && (
      <span className="text-ink-subtle tabular shrink-0 text-xs">{count}</span>
    )}
  </div>
);

// --- active-filter chips ----------------------------------------------------

interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

const buildActiveChips = (
  filters: CatalogFilters,
  set: (update: FilterUpdate) => void,
): ActiveChip[] => {
  const chips: ActiveChip[] = [];
  if (filters.brand !== undefined) {
    chips.push({
      key: "brand",
      label: `Bandeira: ${labelFor(BRAND_OPTIONS, filters.brand)}`,
      onRemove: () => {
        set({ brand: undefined });
      },
    });
  }
  if (filters.tier !== undefined) {
    chips.push({
      key: "tier",
      label: `Categoria: ${labelFor(TIER_OPTIONS, filters.tier)}`,
      onRemove: () => {
        set({ tier: undefined });
      },
    });
  }
  if (filters.hasLounge === true) {
    chips.push({
      key: "hasLounge",
      label: "Com acesso a lounge",
      onRemove: () => {
        set({ hasLounge: undefined });
      },
    });
  }
  if (filters.hasCashback === true) {
    chips.push({
      key: "hasCashback",
      label: "Cashback direto",
      onRemove: () => {
        set({ hasCashback: undefined });
      },
    });
  }
  if (filters.hasInvestback === true) {
    chips.push({
      key: "hasInvestback",
      label: "Investback CDB",
      onRemove: () => {
        set({ hasInvestback: undefined });
      },
    });
  }
  (filters.requiresRelationship ?? []).forEach((value) => {
    chips.push({
      key: `rel-${value}`,
      label: `Acesso: ${labelFor(RELATIONSHIP_OPTIONS, value)}`,
      onRemove: () => {
        set({
          requiresRelationship: (filters.requiresRelationship ?? []).filter((v) => v !== value),
        });
      },
    });
  });
  if (filters.minAnnualFee !== undefined) {
    chips.push({
      key: "minAnnualFee",
      label: feeChipLabel("min", filters.minAnnualFee),
      onRemove: () => {
        set({ minAnnualFee: undefined });
      },
    });
  }
  if (filters.maxAnnualFee !== undefined) {
    chips.push({
      key: "maxAnnualFee",
      label: feeChipLabel("max", filters.maxAnnualFee),
      onRemove: () => {
        set({ maxAnnualFee: undefined });
      },
    });
  }
  return chips;
};

const MobileSelectRow = ({
  label,
  value,
  options,
  emptyLabel,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: readonly { value: string; label: string }[];
  emptyLabel: string;
  onChange: (value: string | undefined) => void;
}): JSX.Element => (
  <label className="border-line flex items-center justify-between gap-4 border-b py-2">
    <span className="text-ink text-sm font-medium">{label}</span>
    <select
      value={value ?? ""}
      onChange={(event) => {
        onChange(event.target.value.length > 0 ? event.target.value : undefined);
      }}
      className="border-line text-ink bg-surface-raised focus:border-ink/40 min-h-9 w-28 rounded-md border px-2 text-sm outline-none"
    >
      <option value="">{emptyLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const MobileFilterGroup = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element => (
  <div className="py-2">
    <p className="text-ink mb-1.5 text-sm font-medium">{label}</p>
    <div className="flex flex-col">{children}</div>
  </div>
);

// --- the bar ----------------------------------------------------------------

export const CatalogFilterBar = ({
  filters,
  counts,
  sort,
  viewMode,
  onChange,
  onSortChange,
  onViewModeChange,
  onClear,
}: CatalogFilterBarProps): JSX.Element => {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const set = (update: FilterUpdate): void => {
    onChange(mergeFilters(filters, update));
  };

  const premiumFreeActive = filters.maxAnnualFee === 0 && filters.hasLounge === true;
  const handlePremiumFree = (): void => {
    set(
      premiumFreeActive
        ? { maxAnnualFee: undefined, hasLounge: undefined }
        : { maxAnnualFee: 0, hasLounge: true },
    );
  };

  const benefitsActive =
    filters.hasLounge === true || filters.hasCashback === true || filters.hasInvestback === true;
  const accessActive = (filters.requiresRelationship?.length ?? 0) > 0;
  const feeActive = filters.minAnnualFee !== undefined || filters.maxAnnualFee !== undefined;

  const setRelationship = (value: CatalogRelationshipFilter, checked: boolean): void => {
    const selected = new Set(filters.requiresRelationship ?? []);
    if (checked) selected.add(value);
    else selected.delete(value);
    const ordered: CatalogRelationshipFilter[] = [];
    for (const option of RELATIONSHIP_OPTIONS) {
      if (selected.has(option.value)) ordered.push(option.value);
    }
    set({ requiresRelationship: ordered.length > 0 ? ordered : undefined });
  };

  const chips = buildActiveChips(filters, set);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative sm:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-expanded={mobileFiltersOpen}
            onClick={() => {
              setMobileFiltersOpen((open) => !open);
            }}
            className={cn(MOBILE_TOOLBAR_BUTTON, "flex-1 justify-between")}
          >
            <span className="inline-flex items-center gap-1.5">
              <SlidersHorizontal size={15} aria-hidden="true" />
              Filtros
            </span>
            <span className="inline-flex items-center gap-1.5">
              {chips.length > 0 ? (
                <span className="text-ink tabular text-xs">{chips.length}</span>
              ) : null}
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={cn("transition-transform", mobileFiltersOpen && "rotate-180")}
              />
            </span>
          </button>

          <label className="relative min-w-0 flex-[1.15]">
            <span className="sr-only">Ordenar catálogo</span>
            <select
              value={sort}
              onChange={(event) => {
                onSortChange(event.target.value as CatalogSort);
              }}
              className={cn(MOBILE_TOOLBAR_BUTTON, "w-full appearance-none pr-8")}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="text-ink-subtle pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
            />
          </label>

          <button
            type="button"
            aria-label={
              viewMode === "grid"
                ? "Alternar catálogo mobile para lista"
                : "Alternar catálogo mobile para grade"
            }
            aria-pressed={viewMode === "list"}
            onClick={() => {
              onViewModeChange(viewMode === "grid" ? "list" : "grid");
            }}
            className={cn(MOBILE_TOOLBAR_BUTTON, "px-2.5")}
          >
            {viewMode === "grid" ? (
              <Grid2X2 size={16} aria-hidden="true" />
            ) : (
              <List size={16} aria-hidden="true" />
            )}
          </button>
        </div>

        {mobileFiltersOpen ? (
          <div className="bg-surface absolute right-0 left-0 z-50 overflow-x-hidden border-t border-b border-none p-3 shadow-md">
            <button
              type="button"
              aria-pressed={premiumFreeActive}
              onClick={handlePremiumFree}
              className={cn(
                "border-line my-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left",
                premiumFreeActive ? "bg-warning-soft/70" : "bg-surface-raised",
              )}
            >
              <span className="min-w-0">
                <span className="text-ink inline-flex items-center gap-2 text-sm font-semibold">
                  <Star
                    size={14}
                    aria-hidden="true"
                    className={cn(
                      "shrink-0",
                      premiumFreeActive ? "text-warning" : "text-ink-subtle",
                    )}
                  />
                  Premium grátis
                </span>
                <span className="text-ink-subtle block text-xs">Sem anuidade + lounge</span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-xs font-medium",
                  premiumFreeActive ? "text-warning" : "text-ink-subtle",
                )}
              >
                {premiumFreeActive ? "Ativo" : "Aplicar"}
              </span>
            </button>

            <MobileSelectRow
              label="Bandeira"
              value={filters.brand}
              options={BRAND_OPTIONS}
              emptyLabel="Todas"
              onChange={(value) => {
                set({ brand: value });
              }}
            />
            <MobileSelectRow
              label="Categoria"
              value={filters.tier}
              options={TIER_OPTIONS}
              emptyLabel="Todas"
              onChange={(value) => {
                set({ tier: value });
              }}
            />

            <MobileFilterGroup label="Benefícios">
              <CheckRow
                label="Acesso a lounge"
                checked={filters.hasLounge === true}
                count={counts?.hasLounge}
                onChange={(event) => {
                  set({ hasLounge: event.target.checked ? true : undefined });
                }}
              />
              <CheckRow
                label="Cashback direto"
                checked={filters.hasCashback === true}
                count={counts?.hasCashback}
                onChange={(event) => {
                  set({ hasCashback: event.target.checked ? true : undefined });
                }}
              />
              <CheckRow
                label="Investback CDB"
                checked={filters.hasInvestback === true}
                count={counts?.hasInvestback}
                onChange={(event) => {
                  set({ hasInvestback: event.target.checked ? true : undefined });
                }}
              />
            </MobileFilterGroup>

            <MobileFilterGroup label="Acesso">
              {RELATIONSHIP_OPTIONS.map((option) => (
                <CheckRow
                  key={option.value}
                  label={option.label}
                  checked={filters.requiresRelationship?.includes(option.value) ?? false}
                  count={counts?.requiresRelationship[option.value]}
                  onChange={(event) => {
                    setRelationship(option.value, event.target.checked);
                  }}
                />
              ))}
            </MobileFilterGroup>

            <div className="py-2">
              <p className="text-ink mb-1.5 text-sm font-medium">Anuidade</p>
              <FeeRangeFields
                min={filters.minAnnualFee}
                max={filters.maxAnnualFee}
                onChange={(next) => {
                  set({ minAnnualFee: next.min, maxAnnualFee: next.max });
                }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="hidden flex-wrap items-center gap-x-2 gap-y-2.5 sm:flex sm:gap-2">
        <button
          type="button"
          aria-pressed={premiumFreeActive}
          onClick={handlePremiumFree}
          className={cn(
            PILL_BASE,
            "border-warning/25 text-warning focus-visible:ring-warning/30",
            premiumFreeActive
              ? "bg-warning-soft ring-warning/35 ring-1"
              : "bg-warning-soft/55 hover:bg-warning-soft",
          )}
        >
          <Star size={13} className="shrink-0 fill-current" aria-hidden="true" />
          <span>Premium grátis</span>
          {premiumFreeActive ? (
            <Check size={14} aria-hidden="true" className="shrink-0" />
          ) : (
            <ArrowRight size={13} aria-hidden="true" className="shrink-0" />
          )}
        </button>

        <Divider />

        <FilterDropdown
          label={
            filters.brand !== undefined
              ? `Bandeira: ${labelFor(BRAND_OPTIONS, filters.brand)}`
              : "Bandeira"
          }
          active={filters.brand !== undefined}
          panelLabel="Filtrar por bandeira"
        >
          {({ close }) => (
            <>
              <OptionRow
                label="Todas as bandeiras"
                selected={filters.brand === undefined}
                onSelect={() => {
                  set({ brand: undefined });
                  close();
                }}
              />
              {BRAND_OPTIONS.map((option) => (
                <OptionRow
                  key={option.value}
                  label={option.label}
                  selected={filters.brand === option.value}
                  onSelect={() => {
                    set({ brand: option.value });
                    close();
                  }}
                />
              ))}
            </>
          )}
        </FilterDropdown>

        <FilterDropdown
          label={
            filters.tier !== undefined
              ? `Categoria: ${labelFor(TIER_OPTIONS, filters.tier)}`
              : "Categoria"
          }
          active={filters.tier !== undefined}
          panelLabel="Filtrar por categoria"
        >
          {({ close }) => (
            <>
              <OptionRow
                label="Todas as categorias"
                selected={filters.tier === undefined}
                onSelect={() => {
                  set({ tier: undefined });
                  close();
                }}
              />
              {TIER_OPTIONS.map((option) => (
                <OptionRow
                  key={option.value}
                  label={option.label}
                  selected={filters.tier === option.value}
                  onSelect={() => {
                    set({ tier: option.value });
                    close();
                  }}
                />
              ))}
            </>
          )}
        </FilterDropdown>

        <FilterDropdown
          label="Benefícios"
          active={benefitsActive}
          panelLabel="Filtrar por benefícios"
        >
          <CheckRow
            label="Acesso a lounge"
            checked={filters.hasLounge === true}
            count={counts?.hasLounge}
            onChange={(event) => {
              set({ hasLounge: event.target.checked ? true : undefined });
            }}
          />
          <CheckRow
            label="Cashback direto"
            checked={filters.hasCashback === true}
            count={counts?.hasCashback}
            onChange={(event) => {
              set({ hasCashback: event.target.checked ? true : undefined });
            }}
          />
          <CheckRow
            label="Investback CDB"
            checked={filters.hasInvestback === true}
            count={counts?.hasInvestback}
            onChange={(event) => {
              set({ hasInvestback: event.target.checked ? true : undefined });
            }}
          />
        </FilterDropdown>

        <FilterDropdown label="Acesso" active={accessActive} panelLabel="Filtrar por acesso">
          {RELATIONSHIP_OPTIONS.map((option) => (
            <CheckRow
              key={option.value}
              label={option.label}
              checked={filters.requiresRelationship?.includes(option.value) ?? false}
              count={counts?.requiresRelationship[option.value]}
              onChange={(event) => {
                setRelationship(option.value, event.target.checked);
              }}
            />
          ))}
        </FilterDropdown>

        <FilterDropdown
          label="Anuidade"
          active={feeActive}
          panelLabel="Filtrar por anuidade"
          panelClassName="w-64"
        >
          <FeeRangeFields
            min={filters.minAnnualFee}
            max={filters.maxAnnualFee}
            onChange={(next) => {
              set({ minAnnualFee: next.min, maxAnnualFee: next.max });
            }}
          />
        </FilterDropdown>

        <Divider />

        <FilterDropdown
          label={`Ordenar: ${labelFor(SORT_OPTIONS, sort)}`}
          active={false}
          panelLabel="Ordenar catálogo"
        >
          {({ close }) =>
            SORT_OPTIONS.map((option) => (
              <OptionRow
                key={option.value}
                label={option.label}
                selected={option.value === sort}
                onSelect={() => {
                  onSortChange(option.value);
                  close();
                }}
              />
            ))
          }
        </FilterDropdown>

        <button
          type="button"
          aria-label={
            viewMode === "grid"
              ? "Visualização em grade, alternar para lista"
              : "Visualização em lista, alternar para grade"
          }
          aria-pressed={viewMode === "list"}
          onClick={() => {
            onViewModeChange(viewMode === "grid" ? "list" : "grid");
          }}
          className={cn(PILL_BASE, PILL_IDLE, "!p-2 !px-2.5")}
        >
          {viewMode === "grid" ? (
            <Grid2X2 size={16} aria-hidden="true" />
          ) : (
            <List size={16} aria-hidden="true" />
          )}
        </button>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="text-ink-subtle text-xs">Filtros ativos:</span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              aria-label={`Remover filtro: ${chip.label}`}
              className="bg-surface-sunken text-ink-muted hover:bg-line/50 hover:text-ink inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-3 text-xs transition-colors"
            >
              <span>{chip.label}</span>
              <X size={12} aria-hidden="true" className="shrink-0 opacity-60" />
            </button>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="text-ink-subtle hover:text-accent ml-1 text-xs italic transition-colors"
          >
            limpar tudo
          </button>
        </div>
      )}
    </div>
  );
};
