import type { JSX } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBrl } from "@/lib/format";

export interface PreferenceComparisonRow {
  /** Card / stack name. */
  label: string;
  /** Short role tag — "melhor cashback acionável" / "cashback maior" / "pontos, recomendado". */
  role: string;
  /** Access note — "Sem barreira de acesso" / "Exige R$ 50.000,00 investidos no emissor" / … */
  note: string;
  /** When true the note is rendered in warning tone with a ⚠ marker (a gated, out-of-reach card). */
  warn: boolean;
  netBrl: number;
  /** The recommended stack itself — its return is shown in accent. */
  recommended: boolean;
}

export interface PreferenceComparison {
  /** "cashback" / "milhas Smiles" / … */
  preferenceLabel: string;
  /** The recommended card's redemption — "pontos Dux Experience" / "cashback" / … */
  recRedemption: string;
  /** Explanatory sentence above the rows. */
  intro: string;
  /** Always ends with the recommended row; may be just that one (case: nothing of the currency). */
  rows: PreferenceComparisonRow[];
}

const annual = (brl: number): string => `${formatBrl(brl)}/ano`;

export const PreferencePanel = ({
  comparison,
}: {
  comparison: PreferenceComparison;
}): JSX.Element => (
  <section
    aria-label={`Sobre sua preferência por ${comparison.preferenceLabel}`}
    className="border-line bg-surface-sunken rounded-md border p-5 sm:p-6"
  >
    <h3 className="text-heading text-ink">
      Sobre sua preferência por {comparison.preferenceLabel}
    </h3>
    <p className="text-ink-muted mt-2 max-w-2xl text-sm leading-relaxed">{comparison.intro}</p>
    {comparison.rows.length > 0 ? (
      <ul className="divide-line/60 mt-5 divide-y text-sm">
        {comparison.rows.map((row) => (
          <li key={row.label} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-ink font-semibold">
                {row.label}
                <span className="text-ink-subtle ml-1.5 text-xs font-normal italic">
                  — {row.role}
                </span>
              </span>
              <span
                className={cn(
                  "tabular shrink-0",
                  row.recommended ? "text-accent font-semibold" : "text-ink",
                )}
              >
                {annual(row.netBrl)}
              </span>
            </div>
            <p
              className={cn(
                "mt-1 flex items-center gap-1 text-xs leading-snug",
                row.warn ? "text-warning" : "text-ink-subtle",
              )}
            >
              {row.warn ? <TriangleAlert size={12} aria-hidden className="shrink-0" /> : null}
              {row.note}
            </p>
          </li>
        ))}
      </ul>
    ) : null}
  </section>
);
