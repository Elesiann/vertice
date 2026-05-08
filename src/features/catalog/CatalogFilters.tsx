import type { ChangeEvent, JSX } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import type { CatalogFilters } from "@/types";

interface CatalogFiltersProps {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  onClear: () => void;
}

// Merge filters, omitting any keys whose value is explicitly undefined.
// Required because the project uses exactOptionalPropertyTypes.
type FilterUpdate = {
  [K in keyof CatalogFilters]?: CatalogFilters[K] | undefined;
};

const mergeFilters = (base: CatalogFilters, update: FilterUpdate): CatalogFilters => {
  const merged = { ...base, ...update };
  return Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined));
};

export const CatalogFiltersPanel = ({
  filters,
  onChange,
  onClear,
}: CatalogFiltersProps): JSX.Element => {
  const set = (update: FilterUpdate) => {
    onChange(mergeFilters(filters, update));
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

  const handleLounge = (e: ChangeEvent<HTMLInputElement>) => {
    set({ hasLounge: e.target.checked ? true : undefined });
  };

  const handleCashback = (e: ChangeEvent<HTMLInputElement>) => {
    set({ hasCashback: e.target.checked ? true : undefined });
  };

  return (
    <aside className="border-line bg-surface-raised flex flex-col gap-4 rounded-xl border p-4">
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

      <Field label="Anuidade máxima (R$)">
        <Input
          type="number"
          min={0}
          placeholder="Sem limite"
          value={filters.maxAnnualFee ?? ""}
          onChange={handleMaxFee}
        />
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
      </div>

      <Button variant="ghost" size="sm" onClick={onClear}>
        Limpar filtros
      </Button>
    </aside>
  );
};
