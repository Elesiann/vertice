import type { ChangeEvent, JSX } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { CatalogFilters, CatalogRelationshipFilter } from "@/types";

export type CatalogSort = "fee_asc" | "fee_desc" | "name_asc";

interface CatalogFiltersProps {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  onClear: () => void;
  sort: CatalogSort;
  onSortChange: (sort: CatalogSort) => void;
}

// Merge filters, omitting any keys whose value is explicitly undefined.
// Required because the project uses exactOptionalPropertyTypes.
type FilterUpdate = {
  [K in keyof CatalogFilters]?: CatalogFilters[K] | undefined;
};

const RELATIONSHIP_OPTIONS: { value: CatalogRelationshipFilter; label: string }[] = [
  { value: "open", label: "Sem relacionamento" },
  { value: "checking", label: "Conta corrente" },
  { value: "investment", label: "Investidor" },
];

const MIN_ANNUAL_FEE_LABEL = "Anuidade mínima (R$)"; // TODO: lint stackr-writing
const MAX_ANNUAL_FEE_LABEL = "Anuidade máxima (R$)";

const isEmptyFilterValue = (value: unknown): boolean =>
  value === undefined || (Array.isArray(value) && value.length === 0);

const mergeFilters = (base: CatalogFilters, update: FilterUpdate): CatalogFilters => {
  const merged = { ...base, ...update };
  return Object.fromEntries(Object.entries(merged).filter(([, v]) => !isEmptyFilterValue(v)));
};

export const CatalogFiltersPanel = ({
  filters,
  onChange,
  onClear,
  sort,
  onSortChange,
}: CatalogFiltersProps): JSX.Element => {
  const hasActiveFilters = Object.values(filters).some((value) => value !== undefined);
  const set = (update: FilterUpdate) => {
    onChange(mergeFilters(filters, update));
  };

  const premiumFreeActive = filters.maxAnnualFee === 0 && filters.hasLounge === true;

  const handlePremiumFree = () => {
    if (premiumFreeActive) {
      set({ maxAnnualFee: undefined, hasLounge: undefined });
      return;
    }
    set({ maxAnnualFee: 0, hasLounge: true });
  };

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    set({ search: e.target.value.length > 0 ? e.target.value : undefined });
  };

  const handleBrand = (e: ChangeEvent<HTMLSelectElement>) => {
    set({ brand: e.target.value.length > 0 ? e.target.value : undefined });
  };

  const handleTier = (e: ChangeEvent<HTMLSelectElement>) => {
    set({ tier: e.target.value.length > 0 ? e.target.value : undefined });
  };

  const handleMaxFee = (e: ChangeEvent<HTMLInputElement>) => {
    set({ maxAnnualFee: e.target.value.length > 0 ? Number(e.target.value) : undefined });
  };

  const handleMinFee = (e: ChangeEvent<HTMLInputElement>) => {
    set({ minAnnualFee: e.target.value.length > 0 ? Number(e.target.value) : undefined });
  };

  const handleLounge = (e: ChangeEvent<HTMLInputElement>) => {
    set({ hasLounge: e.target.checked ? true : undefined });
  };

  const handleCashback = (e: ChangeEvent<HTMLInputElement>) => {
    set({ hasCashback: e.target.checked ? true : undefined });
  };

  const handleSort = (e: ChangeEvent<HTMLSelectElement>) => {
    onSortChange(e.target.value as CatalogSort);
  };

  const handleInvestback = (e: ChangeEvent<HTMLInputElement>) => {
    set({ hasInvestback: e.target.checked ? true : undefined });
  };

  const handleRelationship = (
    value: CatalogRelationshipFilter,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const selected = new Set(filters.requiresRelationship ?? []);
    if (e.target.checked) {
      selected.add(value);
    } else {
      selected.delete(value);
    }
    const next = RELATIONSHIP_OPTIONS.map((option) => option.value).filter((option) =>
      selected.has(option),
    );
    set({ requiresRelationship: next.length > 0 ? next : undefined });
  };

  return (
    <aside className="border-line bg-surface-raised flex flex-col gap-4 rounded-xl border p-4">
      <Field label="Ordenar por">
        <Select value={sort} onChange={handleSort}>
          <option value="fee_asc">Menor anuidade</option>
          <option value="fee_desc">Maior anuidade</option>
          <option value="name_asc">Nome (A–Z)</option>
        </Select>
      </Field>

      <button
        type="button"
        aria-pressed={premiumFreeActive}
        className="self-start"
        onClick={handlePremiumFree}
      >
        <Badge tone={premiumFreeActive ? "accent" : "neutral"}>Premium grátis</Badge>
      </button>

      <Field label="Buscar">
        <Input
          type="search"
          placeholder="Nome ou banco..."
          value={filters.search ?? ""}
          onChange={handleSearch}
        />
      </Field>

      <Field label="Bandeira">
        <Select value={filters.brand ?? ""} onChange={handleBrand}>
          <option value="">Todas</option>
          <option value="visa">Visa</option>
          <option value="mastercard">Mastercard</option>
          <option value="amex">Amex</option>
          <option value="elo">Elo</option>
          <option value="hipercard">Hipercard</option>
        </Select>
      </Field>

      <Field label="Categoria">
        <Select value={filters.tier ?? ""} onChange={handleTier}>
          <option value="">Todas</option>
          <option value="standard">Standard</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
          <option value="black">Black</option>
          <option value="infinite">Infinite</option>
        </Select>
      </Field>

      <Field label="Anuidade entre">
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={0}
            placeholder="0"
            aria-label={MIN_ANNUAL_FEE_LABEL}
            value={filters.minAnnualFee ?? ""}
            onChange={handleMinFee}
          />
          <Input
            type="number"
            min={0}
            placeholder="Sem limite"
            aria-label={MAX_ANNUAL_FEE_LABEL}
            value={filters.maxAnnualFee ?? ""}
            onChange={handleMaxFee}
          />
        </div>
      </Field>

      <div className="flex flex-col gap-2">
        <label className="text-ink flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={filters.hasLounge === true} onChange={handleLounge} />
          Com acesso a lounge
        </label>
        <label className="text-ink flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={filters.hasCashback === true} onChange={handleCashback} />
          Com cashback
        </label>
        <label className="text-ink flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={filters.hasInvestback === true} onChange={handleInvestback} />
          Investback (CDB automático)
        </label>
      </div>

      <Field label="Relacionamento">
        <div className="flex flex-col gap-2">
          {RELATIONSHIP_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="text-ink flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={filters.requiresRelationship?.includes(option.value) ?? false}
                onChange={(event) => {
                  handleRelationship(option.value, event);
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </Field>

      {hasActiveFilters ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Limpar filtros
        </Button>
      ) : null}
    </aside>
  );
};
