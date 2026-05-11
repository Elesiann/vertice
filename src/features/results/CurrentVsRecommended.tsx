import { Fragment, useState, type JSX } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import type { ComparisonNarrative, ComparisonRow } from "@/lib/comparison-narrative";
import { formatBrl, formatRoiMultiple, formatUsd } from "@/lib/format";
import type { ScoreLabVerdictKind } from "@/types";

// Text-color classes for the verdict tag — distinct from ResultsView.VERDICT_TONE (Badge tones).
const VERDICT_TEXT_TONE: Record<ScoreLabVerdictKind, string> = {
  strong: "text-accent",
  viable: "text-ink-muted",
  negative: "text-warning",
};

const VerdictTag = ({
  verdict,
}: {
  verdict: { kind: ScoreLabVerdictKind; label: string };
}): JSX.Element => (
  <span className={cn("mt-1.5 block text-xs leading-snug", VERDICT_TEXT_TONE[verdict.kind])}>
    {verdict.label}
  </span>
);

interface Props {
  narrative: ComparisonNarrative;
  currentLabel: string;
  recommendedLabel: string;
}

// Returns the bg-cell-* tint class for a value cell, or null when no tint applies.
const cellTint = (row: ComparisonRow, side: "current" | "recommended"): string | null => {
  if (row.key === "net" || row.tone === undefined) return null;
  if (row.tone === "tie") return "bg-cell-neutral";
  if (row.tone === "current-better")
    return side === "current" ? "bg-cell-positive" : "bg-cell-negative";
  // tone is "recommended-better" here — the only remaining ComparisonRow["tone"] value.
  return side === "recommended" ? "bg-cell-positive" : "bg-cell-negative";
};

// Returns the text-color + bg-tint classes for a value cell.
const cellClasses = (
  row: ComparisonRow,
  side: "current" | "recommended",
  value: number,
): string => {
  const textClass =
    row.key === "net" && value < 0
      ? "text-warning tabular"
      : row.key === "annual-fee" || row.key === "fx-iof"
        ? "text-ink-muted tabular"
        : "text-ink tabular";
  return cn(textClass, cellTint(row, side));
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

// Left-aligned so the longer waiver/break-even sentences stay readable even though the
// value above them is right-aligned in the cell.
const SubLine = ({ text }: { text: string }): JSX.Element => (
  <span className="text-ink-subtle mt-1 block text-left text-xs leading-snug font-normal">
    {text}
  </span>
);

// Marker shown inside the toggle button: "+" collapsed, "−" expanded.
// Cannot reuse `.disclosure-inline` (it targets `<summary>`); these values mirror that CSS.
const ToggleMarker = ({ expanded }: { expanded: boolean }): JSX.Element => (
  <span
    aria-hidden
    className={cn(
      "ml-1.5 inline-grid place-items-center rounded-full border text-[0.78rem] leading-none",
      "border-line-strong h-[1.05rem] w-[1.05rem]",
      expanded ? "text-accent" : "text-ink-subtle",
    )}
  >
    {expanded ? "−" : "+"}
  </span>
);

// Ordered list of all component labels that appear in either breakdown, preserving
// the canonical Sala VIP / Seguro / Bagagem order and deduplicating.
const BREAKDOWN_ORDER = ["Sala VIP", "Seguro", "Bagagem"] as const;

const mergeBreakdownLabels = (row: ComparisonRow): string[] => {
  const presentInEither = new Set([
    ...(row.currentBreakdown ?? []).map((p) => p.label),
    ...(row.recommendedBreakdown ?? []).map((p) => p.label),
  ]);
  return BREAKDOWN_ORDER.filter((l) => presentInEither.has(l));
};

const hasBreakdown = (row: ComparisonRow): boolean =>
  (row.currentBreakdown?.length ?? 0) > 0 || (row.recommendedBreakdown?.length ?? 0) > 0;

export const CurrentVsRecommended = ({
  narrative,
  currentLabel,
  recommendedLabel,
}: Props): JSX.Element => {
  const roiLine = annualFeeRoiLine(narrative);
  // Expansion is tracked per row key so it generalises if more rows become expandable.
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());
  const toggleRow = (key: string): void => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <thead>
            <tr>
              <th aria-hidden className="w-[42%]" />
              <th scope="col" className="pb-4 pl-6 text-right align-bottom font-normal">
                <span className="text-caption text-ink-subtle block">HOJE</span>
                <span className="text-ink mt-1 block text-sm font-semibold">{currentLabel}</span>
                {narrative.currentVerdict !== undefined ? (
                  <VerdictTag verdict={narrative.currentVerdict} />
                ) : null}
              </th>
              <th scope="col" className="pb-4 pl-6 text-right align-bottom font-normal">
                <span className="text-caption text-ink-subtle block">RECOMENDADO</span>
                <span className="text-ink mt-1 block text-sm font-semibold">
                  {recommendedLabel}
                </span>
                <Badge tone="gold" className="mt-1.5">
                  <Star size={12} aria-hidden />
                  recomendado
                </Badge>
                {narrative.recommendedVerdict !== undefined ? (
                  <VerdictTag verdict={narrative.recommendedVerdict} />
                ) : null}
              </th>
            </tr>
          </thead>
          <tbody className="divide-line border-line divide-y border-t">
            {narrative.rows.map((row) => {
              const isNet = row.key === "net";
              const isAnnualFee = row.key === "annual-fee";
              const expandable = hasBreakdown(row);
              const isExpanded = expandable && expandedRows.has(row.key);
              const labels = expandable ? mergeBreakdownLabels(row) : [];

              return (
                <Fragment key={row.key}>
                  <tr>
                    <th
                      scope="row"
                      className={cn(
                        "py-3 pr-6 text-left font-normal",
                        isNet ? "text-ink font-semibold" : "text-ink-muted",
                      )}
                    >
                      {expandable ? (
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => {
                            toggleRow(row.key);
                          }}
                          className={cn(
                            "inline-flex cursor-pointer items-center",
                            "text-ink-muted font-normal",
                            "focus-visible:outline-accent focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1",
                            "hover:[&_span]:text-accent",
                          )}
                        >
                          {row.label}
                          <ToggleMarker expanded={isExpanded} />
                        </button>
                      ) : (
                        row.label
                      )}
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
                  {isExpanded &&
                    labels.map((label) => {
                      // null = component absent on that side → em-dash; any number (incl. 0) prints.
                      const currentVal =
                        row.currentBreakdown?.find((p) => p.label === label)?.valueBrl ?? null;
                      const recommendedVal =
                        row.recommendedBreakdown?.find((p) => p.label === label)?.valueBrl ?? null;
                      return (
                        // border-t-0 suppresses the divide-y hairline inherited from <tbody>.
                        <tr key={label} className="border-t-0">
                          <th
                            scope="row"
                            className="text-ink-subtle py-2 pr-6 pl-4 text-left text-xs font-normal"
                          >
                            {label}
                          </th>
                          <td className="text-ink-subtle tabular py-2 pl-6 text-right text-xs">
                            {currentVal !== null ? formatBrl(currentVal) : "—"}
                          </td>
                          <td className="text-ink-subtle tabular py-2 pl-6 text-right text-xs">
                            {recommendedVal !== null ? formatBrl(recommendedVal) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                </Fragment>
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
      </div>
    </section>
  );
};
