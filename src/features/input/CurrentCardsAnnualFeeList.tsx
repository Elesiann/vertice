import type { JSX } from "react";
import { cn } from "@/lib/cn";
import type { CardOption } from "@/types";

interface CurrentCardsAnnualFeeListProps {
  selectedIds: string[];
  options: CardOption[];
  value: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
}

// Defaults to "paga" when no explicit answer exists — conservative, avoids the
// double-isenção problem when investback would otherwise be credited to several cards.
const paysFee = (value: Record<string, boolean>, id: string): boolean => value[id] !== false;

export const CurrentCardsAnnualFeeList = ({
  selectedIds,
  options,
  value,
  onChange,
}: CurrentCardsAnnualFeeListProps): JSX.Element | null => {
  if (selectedIds.length === 0) return null;

  // Only ask about cards that have an annual fee — the question is meaningless
  // for free cards.
  const rows = selectedIds
    .map((id) => ({ id, card: options.find((o) => o.id === id) }))
    .filter(
      (row): row is { id: string; card: CardOption } =>
        row.card !== undefined && row.card.annualFeeBrl > 0,
    );

  if (rows.length === 0) return null;

  const set = (id: string, pays: boolean): void => {
    onChange({ ...value, [id]: pays });
  };

  return (
    <div className="border-line bg-surface-raised mt-3 rounded-md border px-4 py-3">
      <p className="text-ink-muted text-sm leading-relaxed">
        Você paga anuidade nesses cartões hoje?
      </p>
      <ul className="mt-3 flex flex-col divide-y divide-[var(--color-line)]">
        {rows.map(({ id, card }) => {
          const pays = paysFee(value, id);
          const groupName = `annual-fee-${id}`;
          return (
            <li
              key={id}
              className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
            >
              <span className="text-ink min-w-0 flex-1 truncate text-sm">{card.name}</span>
              <fieldset className="flex shrink-0 items-center gap-3">
                <legend className="sr-only">{`Anuidade — ${card.name}`}</legend>
                <RadioPill
                  name={groupName}
                  checked={pays}
                  onChange={() => {
                    set(id, true);
                  }}
                  label="paga"
                />
                <RadioPill
                  name={groupName}
                  checked={!pays}
                  onChange={() => {
                    set(id, false);
                  }}
                  label="não paga"
                />
              </fieldset>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

interface RadioPillProps {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}

const RadioPill = ({ name, checked, onChange, label }: RadioPillProps): JSX.Element => (
  <label
    className={cn(
      "border-line text-ink-muted hover:border-line-strong cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition select-none",
      "focus-within:ring-accent/40 focus-within:ring-2",
      checked ? "border-accent bg-accent/10 text-ink" : "",
    )}
  >
    <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
    {label}
  </label>
);
