import { Fragment, useState, type JSX, type ReactNode } from "react";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import type {
  BenefitBreakdownPart,
  ComparisonNarrative,
  ComparisonRow,
  FeeDetail,
  FeeWaiverRoute,
} from "@/lib/comparison-narrative";
import { formatBrl, formatRoiMultiple, formatUsd } from "@/lib/format";
import type { ScoreLabVerdictKind } from "@/types";

interface Props {
  narrative: ComparisonNarrative;
  currentLabel: string;
  recommendedLabel: string;
}

type Side = "current" | "recommended";

const benefitUnit = (label: string, count: number): string => {
  const plural = count !== 1;
  return label === "Sala VIP" ? (plural ? "acessos" : "acesso") : plural ? "viagens" : "viagem";
};

// "{count} {unit} × {unitBrl} = {totalBrl}"; "N de M unit" prefix when the card caps visits below demand.
// Em-dash when the component is absent on that side.
const breakdownCellText = (part: BenefitBreakdownPart | undefined): string => {
  if (part === undefined) return "—";
  const unit = benefitUnit(part.label, part.count);
  const countStr =
    part.demanded > part.count
      ? `${String(part.count)} de ${String(part.demanded)} ${unit}`
      : `${String(part.count)} ${unit}`;
  return `${countStr} × ${formatBrl(part.unitBrl)} = ${formatBrl(part.totalBrl)}`;
};

// ─── copy helpers ─────────────────────────────────────────────────────────────

const spendCaption = (n: ComparisonNarrative): string => {
  const base = `Gasto base: ${formatBrl(n.monthlySpendBrl)}/mês`;
  return n.monthlyInternationalUsd > 0
    ? `${base} + ${formatUsd(n.monthlyInternationalUsd)}/mês internacional`
    : base;
};

// The break-even / ROI for the *current* card's annual fee, phrased as a clause that follows
// "A anuidade do {card} …". Only meaningful when the current card actually charges one.
const annualFeeRoiClause = (n: ComparisonNarrative): string | null => {
  const breakEven = n.currentBreakEvenMonthlySpendBrl;
  const roi = n.currentRoiMultiple;
  if (breakEven !== null && roi !== null)
    return `se paga com ${formatBrl(breakEven)}/mês em gastos · cada R$ 1 retorna ${formatRoiMultiple(roi)}`;
  if (breakEven !== null) return `se paga com ${formatBrl(breakEven)}/mês em gastos`;
  if (roi !== null) return `retorna ${formatRoiMultiple(roi)} em valor para cada R$ 1 cobrado`;
  return null;
};

// ─── annual-fee detail copy ───────────────────────────────────────────────────

const routeLabel = (route: FeeWaiverRoute): string =>
  route.kind === "spend"
    ? `${formatBrl(route.amountBrl)}/mês`
    : `${formatBrl(route.amountBrl)} investidos`;

// The "Condições" cell content — kept short so it fits the same column width as the travel-benefit
// breakdown cells. The fee amount itself is already in the value cell above; this answers only "how
// to get it waived". For a charged card "isenta com …" reads as the hypothetical. Each route label
// stays on one line so "R$ 8.000,00/mês" never wraps after the slash.
const feeConditionCell = (detail: FeeDetail | undefined): ReactNode => {
  if (detail === undefined) return "—";
  if (detail.status === "no-fee") return "sem anuidade";
  if (detail.routes.length === 0) return detail.status === "charged" ? "sem isenção" : "isenta";
  return (
    <>
      isenta com{" "}
      {detail.routes.map((route, i) => (
        <Fragment key={route.kind}>
          {i > 0 ? " ou " : null}
          <span className="whitespace-nowrap">{routeLabel(route)}</span>
        </Fragment>
      ))}
    </>
  );
};

// ─── verdict tag (amber only when there's something to warn about) ────────────

const verdictToneClass = (kind: ScoreLabVerdictKind): string =>
  kind === "negative" ? "text-warning" : "text-ink-subtle";

const VerdictTag = ({
  verdict,
}: {
  verdict: { kind: ScoreLabVerdictKind; label: string };
}): JSX.Element => (
  <span className={cn("mt-1 block text-xs leading-snug", verdictToneClass(verdict.kind))}>
    {verdict.label}
  </span>
);

// ─── expand affordance ────────────────────────────────────────────────────────

// Tiny "+" / "−" disc, mirroring the .disclosure-inline marker (which targets <summary>).
const ToggleDisc = ({ open }: { open: boolean }): JSX.Element => (
  <span
    aria-hidden
    className={cn(
      "border-line-strong ml-1.5 inline-grid h-[1.05rem] w-[1.05rem] place-items-center rounded-full border text-[0.78rem] leading-none transition-colors",
      open ? "text-accent" : "text-ink-subtle",
    )}
  >
    {open ? "−" : "+"}
  </span>
);

// ─── progressive disclosure ───────────────────────────────────────────────────

const BREAKDOWN_ORDER = ["Sala VIP", "Seguro", "Bagagem"] as const;

const mergeBreakdownLabels = (row: ComparisonRow): string[] => {
  const present = new Set([
    ...(row.currentBreakdown ?? []).map((p) => p.label),
    ...(row.recommendedBreakdown ?? []).map((p) => p.label),
  ]);
  return BREAKDOWN_ORDER.filter((label) => present.has(label));
};

const hasTravelBreakdown = (row: ComparisonRow): boolean =>
  (row.currentBreakdown?.length ?? 0) > 0 || (row.recommendedBreakdown?.length ?? 0) > 0;

const hasAnnualFeeDetail = (row: ComparisonRow): boolean =>
  row.key === "annual-fee" &&
  (row.currentFeeDetail !== undefined || row.recommendedFeeDetail !== undefined);

const isExpandableRow = (row: ComparisonRow): boolean =>
  (row.key === "travel-benefit" && hasTravelBreakdown(row)) || hasAnnualFeeDetail(row);

// ─── value cell ───────────────────────────────────────────────────────────────

const isWinningSide = (row: ComparisonRow, side: Side): boolean => {
  // The comparison view only renders when the recommendation outperforms, so the net row's
  // winner is always the recommended side.
  if (row.key === "net") return side === "recommended";
  return (
    (side === "current" && row.tone === "current-better") ||
    (side === "recommended" && row.tone === "recommended-better")
  );
};

const ValueCell = ({
  row,
  side,
  value,
}: {
  row: ComparisonRow;
  side: Side;
  value: number;
}): JSX.Element => {
  const isNet = row.key === "net";
  const negativeNet = isNet && value < 0;
  const winner = isWinningSide(row, side);
  const loser = !winner && row.tone !== "tie";

  const color = negativeNet ? "text-warning" : loser ? "text-ink-muted" : "text-ink";
  const weight = isNet ? "font-semibold" : winner ? "font-medium" : "font-normal";
  const marked = winner && !negativeNet;

  return (
    <td className={cn("tabular py-3.5 pl-6 text-right", color, weight)}>
      <span aria-hidden className="mr-1.5 inline-block w-3 align-middle">
        {marked ? <Check size={12} className="text-accent" /> : null}
      </span>
      {formatBrl(value)}
      {marked ? <span className="sr-only"> — melhor neste item</span> : null}
    </td>
  );
};

// ─── detail sub-rows ──────────────────────────────────────────────────────────

// One sub-row, the same shape as the travel-benefit breakdown rows: a "Condições" label, then each
// card's short waiver condition in its own value column (right-aligned, like the breakdown cells).
const AnnualFeeDetailRow = ({ row }: { row: ComparisonRow }): JSX.Element => (
  <tr className="border-t-0">
    <th scope="row" className="text-ink-subtle py-2 pr-6 pl-4 text-left text-xs font-normal">
      Condições
    </th>
    <td className="text-ink-subtle tabular py-2 pl-6 text-right text-xs leading-snug">
      {feeConditionCell(row.currentFeeDetail)}
    </td>
    <td className="text-ink-subtle tabular py-2 pl-6 text-right text-xs leading-snug">
      {feeConditionCell(row.recommendedFeeDetail)}
    </td>
  </tr>
);

const BreakdownDetailRows = ({ row }: { row: ComparisonRow }): JSX.Element => (
  <>
    {mergeBreakdownLabels(row).map((label) => {
      const current = row.currentBreakdown?.find((p) => p.label === label);
      const recommended = row.recommendedBreakdown?.find((p) => p.label === label);
      return (
        <tr key={label} className="border-t-0">
          <th scope="row" className="text-ink-subtle py-2 pr-6 pl-4 text-left text-xs font-normal">
            {label}
          </th>
          <td className="text-ink-subtle tabular py-2 pl-6 text-right text-xs">
            {breakdownCellText(current)}
          </td>
          <td className="text-ink-subtle tabular py-2 pl-6 text-right text-xs">
            {breakdownCellText(recommended)}
          </td>
        </tr>
      );
    })}
  </>
);

// ─── main ─────────────────────────────────────────────────────────────────────

export const CurrentVsRecommended = ({
  narrative,
  currentLabel,
  recommendedLabel,
}: Props): JSX.Element => {
  const annualFeeRow = narrative.rows.find((r) => r.key === "annual-fee");
  const roiClause =
    annualFeeRow?.currentFeeDetail?.status === "charged" ? annualFeeRoiClause(narrative) : null;
  const tableNote =
    roiClause !== null
      ? `${spendCaption(narrative)} — A anuidade do ${currentLabel} ${roiClause}.`
      : spendCaption(narrative);
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
      className="border-line mt-8 space-y-6 border-t border-b py-8 md:py-10"
    >
      <div className="text-ink-muted max-w-2xl space-y-2 text-sm leading-relaxed">
        {narrative.diagnosis.map((paragraph, index) => (
          <p key={index} className={index === 0 ? "text-ink" : undefined}>
            {paragraph}
          </p>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] table-fixed text-sm">
          <thead>
            <tr>
              <th aria-hidden className="w-[34%]" />
              <th scope="col" className="pb-3 pl-6 text-right align-bottom font-normal">
                <span className="text-caption text-ink-subtle block">SEU CARTÃO</span>
                <span className="text-ink mt-0.5 block font-semibold">{currentLabel}</span>
                {narrative.currentVerdict !== undefined ? (
                  <VerdictTag verdict={narrative.currentVerdict} />
                ) : null}
              </th>
              <th scope="col" className="pb-3 pl-6 text-right align-bottom font-normal">
                <Badge tone="gold" className="mt-1">
                  <Star size={11} aria-hidden />
                  <span className="text-caption block">RECOMENDADO</span>
                </Badge>
                <span className="text-ink mt-0.5 block text-[1rem] font-semibold">
                  {recommendedLabel}
                </span>
                {narrative.recommendedVerdict !== undefined ? (
                  <VerdictTag verdict={narrative.recommendedVerdict} />
                ) : null}
              </th>
            </tr>
          </thead>
          <tbody className="divide-line border-line divide-y border-t">
            {narrative.rows.map((row) => {
              const isNet = row.key === "net";
              const expandable = isExpandableRow(row);
              const isExpanded = expandable && expandedRows.has(row.key);

              return (
                <Fragment key={row.key}>
                  <tr>
                    <th
                      scope="row"
                      className={cn(
                        "py-3.5 pr-6 text-left font-normal",
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
                          className="focus-visible:outline-accent hover:[&_span]:text-accent inline-flex cursor-pointer items-center font-normal transition-colors focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                        >
                          {row.label}
                          <ToggleDisc open={isExpanded} />
                        </button>
                      ) : (
                        row.label
                      )}
                    </th>
                    <ValueCell row={row} side="current" value={row.currentValueBrl} />
                    <ValueCell row={row} side="recommended" value={row.recommendedValueBrl} />
                  </tr>

                  {isExpanded && row.key === "annual-fee" ? <AnnualFeeDetailRow row={row} /> : null}
                  {isExpanded && row.key === "travel-benefit" ? (
                    <BreakdownDetailRows row={row} />
                  ) : null}
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

      <p className="text-ink-subtle text-xs">{tableNote}</p>
    </section>
  );
};
