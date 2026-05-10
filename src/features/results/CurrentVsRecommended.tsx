import { type JSX } from "react";
import { cn } from "@/lib/cn";
import type { ComparisonNarrative, ComparisonRow } from "@/lib/comparison-narrative";
import { formatBrl } from "@/lib/format";

interface Props {
  narrative: ComparisonNarrative;
  currentLabel: string;
  recommendedLabel: string;
}

const valueClass = (row: ComparisonRow, value: number): string => {
  if (row.key === "net" && value < 0) return "text-warning tabular";
  if (row.key === "annual-fee" || row.key === "fx-iof") return "text-ink-muted tabular";
  return "text-ink tabular";
};

export const CurrentVsRecommended = ({
  narrative,
  currentLabel,
  recommendedLabel,
}: Props): JSX.Element => {
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
                    valueClass(row, row.currentValueBrl),
                    isNet ? "font-semibold" : null,
                  )}
                >
                  {formatBrl(row.currentValueBrl)}
                </td>
                <td
                  className={cn(
                    "py-3 pl-6 text-right",
                    valueClass(row, row.recommendedValueBrl),
                    isNet ? "font-semibold" : null,
                  )}
                >
                  {formatBrl(row.recommendedValueBrl)}
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
