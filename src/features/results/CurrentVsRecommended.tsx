import { type JSX } from "react";
import { cn } from "@/lib/cn";
import type { ComparisonNarrative, ComparisonRow } from "@/lib/comparison-narrative";
import { formatBrl, formatRoiMultiple, formatUsd } from "@/lib/format";

interface Props {
  narrative: ComparisonNarrative;
  currentLabel: string;
  recommendedLabel: string;
}

// Returns the text-color classes for a value cell. `side` is unused today; it is a seam
// so a later task can add per-side `bg-cell-*` tint classes off `row.tone`.
const cellClasses = (
  row: ComparisonRow,
  _side: "current" | "recommended",
  value: number,
): string => {
  if (row.key === "net" && value < 0) return "text-warning tabular";
  if (row.key === "annual-fee" || row.key === "fx-iof") return "text-ink-muted tabular";
  return "text-ink tabular";
};

const spendCaption = (narrative: ComparisonNarrative): string => {
  const base = `Gasto base: ${formatBrl(narrative.monthlySpendBrl)}/mês`;
  if (narrative.monthlyInternationalUsd > 0) {
    return `${base} + ${formatUsd(narrative.monthlyInternationalUsd)}/mês internacional`;
  }
  return base;
};

const annualFeeRoiLine = (narrative: ComparisonNarrative): string | null => {
  const breakEven = narrative.currentBreakEvenMonthlySpendBrl;
  const roi = narrative.currentRoiMultiple;
  if (breakEven !== null && roi !== null) {
    return `a anuidade se paga a partir de ${formatBrl(breakEven)}/mês em gastos · cada R$ 1 retorna ${formatRoiMultiple(roi)}`;
  }
  if (breakEven !== null) {
    return `a anuidade se paga a partir de ${formatBrl(breakEven)}/mês em gastos`;
  }
  if (roi !== null) {
    return `cada R$ 1 de anuidade retorna ${formatRoiMultiple(roi)}`;
  }
  return null;
};

const SubLine = ({ text }: { text: string }): JSX.Element => (
  <span className="text-ink-subtle mt-1 block text-xs leading-snug font-normal">{text}</span>
);

export const CurrentVsRecommended = ({
  narrative,
  currentLabel,
  recommendedLabel,
}: Props): JSX.Element => {
  const roiLine = annualFeeRoiLine(narrative);

  return (
    <section
      aria-label="Comparação com seu cartão atual"
      className="border-line mt-8 space-y-8 border-t border-b py-8 md:py-10"
    >
      <div className="text-ink-muted max-w-2xl space-y-3 text-sm leading-relaxed">
        {narrative.diagnosis.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <p className="text-ink-subtle text-xs leading-relaxed">{spendCaption(narrative)}</p>

      <table className="w-full text-sm">
        <thead>
          <tr>
            <th aria-hidden className="w-[42%]" />
            <th scope="col" className="pb-4 pl-6 text-right align-bottom font-normal">
              <span className="text-caption text-ink-subtle block">HOJE</span>
              <span className="text-ink mt-1 block text-sm font-semibold">{currentLabel}</span>
            </th>
            <th scope="col" className="pb-4 pl-6 text-right align-bottom font-normal">
              <span className="text-caption text-ink-subtle block">RECOMENDADO</span>
              <span className="text-ink mt-1 block text-sm font-semibold">{recommendedLabel}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-line border-line divide-y border-t">
          {narrative.rows.map((row) => {
            const isNet = row.key === "net";
            const isAnnualFee = row.key === "annual-fee";
            return (
              <tr key={row.key}>
                <th
                  scope="row"
                  className={cn(
                    "py-3 pr-6 text-left font-normal",
                    isNet ? "text-ink font-semibold" : "text-ink-muted",
                  )}
                >
                  {row.label}
                </th>
                <td
                  className={cn(
                    "py-3 pl-6 text-right",
                    cellClasses(row, "current", row.currentValueBrl),
                    isNet ? "font-semibold" : null,
                  )}
                >
                  {formatBrl(row.currentValueBrl)}
                  {row.currentSubLabel !== undefined ? (
                    <SubLine text={row.currentSubLabel} />
                  ) : null}
                  {isAnnualFee && roiLine !== null ? <SubLine text={roiLine} /> : null}
                </td>
                <td
                  className={cn(
                    "py-3 pl-6 text-right",
                    cellClasses(row, "recommended", row.recommendedValueBrl),
                    isNet ? "font-semibold" : null,
                  )}
                >
                  {formatBrl(row.recommendedValueBrl)}
                  {row.recommendedSubLabel !== undefined ? (
                    <SubLine text={row.recommendedSubLabel} />
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-line-strong border-t-2">
            <th scope="row" className="text-ink py-5 pr-6 text-left text-base font-semibold">
              Diferença anual
            </th>
            <td colSpan={2} className="py-5 pl-6 text-right">
              <span className="text-display-3 text-accent tabular font-semibold">
                {formatBrl(narrative.verdictBrl)}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
};
