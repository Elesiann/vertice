import { Fragment, useRef, useState, type JSX, type ReactNode } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Check, Info, Star, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import type {
  BenefitBreakdownPart,
  ComparisonNarrative,
  ComparisonRow,
  FeeDetail,
  FeeWaiverRoute,
} from "@/lib/comparison-narrative";
import { formatBrl, formatUsd } from "@/lib/format";
import type { ScoreLabVerdictKind } from "@/types";

const EMPTY_BENEFITS: string[] = [];
import { PreferencePanel, type PreferenceComparison } from "@/features/results/PreferencePanel";

interface Props {
  narrative: ComparisonNarrative;
  currentLabel: string;
  recommendedLabel: string;
  // Free-text highlights of the recommended card ("Lounge ilimitado (...)", "Pontos não expiram",
  // ...) — the qualitative side the money table can't show. Rendered as the comparison footer.
  recommendedBenefits?: string[];
  // Short eligibility line for the recommended card ("exige R$ X investidos no emissor" /
  // "sem exigência financeira"). Shown in the thin meta line under the footer.
  accessLabel?: string;
  // The "you picked X, the recommendation is Y" comparison, when the chosen redemption diverges
  // from the recommended card's. Rendered as a panel between the table and the highlights.
  preferenceComparison?: PreferenceComparison;
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

const spendBaseValue = (n: ComparisonNarrative): string => {
  const base = `${formatBrl(n.monthlySpendBrl)}/mês`;
  return n.monthlyInternationalUsd > 0
    ? `${base} + ${formatUsd(n.monthlyInternationalUsd)}/mês internacional`
    : base;
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

// ─── verdict pill ────────────────────────────────────────────────────────────

const VERDICT_PILL_LABEL: Record<ScoreLabVerdictKind, string> = {
  strong: "Forte candidato",
  viable: "Viável",
  negative: "Atenção",
};

const VERDICT_PILL_TONE: Record<ScoreLabVerdictKind, "accent" | "warning" | "danger"> = {
  strong: "accent",
  viable: "warning",
  negative: "danger",
};

// ─── expand affordance ────────────────────────────────────────────────────────

// Tiny "+" / "−" disc, mirroring the .disclosure-inline marker (which targets <summary>).
const ToggleDisc = ({ open }: { open: boolean }): JSX.Element => (
  <span
    aria-hidden
    className={cn(
      "border-line-strong ml-1.5 inline-grid h-[1.05rem] w-[1.05rem] place-items-center rounded-full border text-[0.78rem] leading-none transition-colors",
      open ? "text-accent-muted" : "text-ink-subtle",
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

  // The net row is the table's bottom line; its winning side carries the accent.
  const color = negativeNet
    ? "text-warning"
    : isNet && winner
      ? "text-accent"
      : loser
        ? "text-ink-muted"
        : "text-ink";
  const weight = isNet ? "font-semibold" : winner ? "font-medium" : "font-normal";
  const marked = winner && !negativeNet;

  return (
    <td
      className={cn("tabular pl-6 text-right", isNet ? "py-5 text-base" : "py-3.5", color, weight)}
    >
      <span aria-hidden className="mr-1.5 inline-block w-3 align-middle">
        {marked ? (
          <Check size={isNet ? 12 : 10} className={isNet ? "text-accent" : "text-ink-muted"} />
        ) : null}
      </span>
      {formatBrl(value)}
      {marked ? <span className="sr-only">, melhor neste item</span> : null}
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

// ─── mobile breakdown row ────────────────────────────────────────────────────

const SIDE_WIDTH = "w-[5.5rem]";

const BreakdownMobileRow = ({
  side,
  part,
  benefitLabel,
}: {
  side: string;
  part: BenefitBreakdownPart | undefined;
  benefitLabel: string;
}): JSX.Element => {
  if (part === undefined) {
    return (
      <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-2 text-xs leading-snug">
        <span className={cn("text-ink-subtle", SIDE_WIDTH)}>{side}</span>
        <span className="text-ink-subtle">Sem valor</span>
      </div>
    );
  }
  const unit = benefitUnit(benefitLabel, part.count);
  const countStr =
    part.demanded > part.count
      ? `${String(part.count)} de ${String(part.demanded)} ${unit}`
      : `${String(part.count)} ${unit}`;
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-2 text-xs leading-snug">
      <span className={cn("text-ink-subtle", SIDE_WIDTH)}>{side}</span>
      <span className="text-ink-subtle tabular text-right">{countStr}</span>
      <span className="text-ink tabular font-medium">{formatBrl(part.totalBrl)}</span>
    </div>
  );
};

// ─── mobile breakdown dialog ─────────────────────────────────────────────────

const BreakdownDialog = ({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}): JSX.Element => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <Dialog
          open={open}
          onClose={onClose}
          ariaLabel={title}
          initialFocusRef={closeButtonRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-5"
        >
          <m.div
            className="absolute inset-0 bg-black/40"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            {...(reduceMotion ? {} : { exit: { opacity: 0 } })}
            onClick={onClose}
          />
          <m.div
            className="bg-surface-raised border-line relative w-full max-w-sm rounded-xl border p-5 shadow-lg"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            {...(reduceMotion ? {} : { exit: { opacity: 0, scale: 0.95 } })}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-ink text-base font-semibold">{title}</p>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="text-ink-muted hover:text-ink focus-visible:ring-accent inline-flex size-8 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            {children}
          </m.div>
        </Dialog>
      ) : null}
    </AnimatePresence>
  );
};

// ─── main ─────────────────────────────────────────────────────────────────────

export const CurrentVsRecommended = ({
  narrative,
  currentLabel,
  recommendedLabel,
  recommendedBenefits = EMPTY_BENEFITS,
  accessLabel = "sem exigência financeira",
  preferenceComparison,
}: Props): JSX.Element => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());
  const toggleRow = (key: string): void => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const [breakdownDialogKey, setBreakdownDialogKey] = useState<string | null>(null);

  return (
    <section
      aria-label="Comparação com seu cartão atual"
      className="border-line mt-8 space-y-6 border-t border-b py-8 md:py-10"
    >
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[28rem] table-fixed text-sm">
          <thead>
            <tr>
              <th scope="col" className="w-[34%] pb-3 text-left align-bottom font-normal">
                <span className="text-caption text-ink-subtle block">Comparação anual</span>
                {narrative.diagnosis.map((note) => (
                  <span
                    key={note}
                    className="text-ink-subtle mt-1 block text-xs leading-snug italic"
                  >
                    {note}
                  </span>
                ))}
              </th>
              <th scope="col" className="pb-3 pl-6 text-right align-bottom font-normal">
                <span className="text-caption text-ink-subtle block">SEU CARTÃO</span>
                <span className="text-ink mt-0.5 block font-semibold">{currentLabel}</span>
              </th>
              <th scope="col" className="pb-3 pl-6 text-right align-bottom font-normal">
                <Badge tone="gold" className="mt-1">
                  <Star size={11} aria-hidden />
                  <span className="text-caption block">RECOMENDADO</span>
                </Badge>
                <span className="text-ink mt-0.5 block text-[1rem] font-semibold">
                  {recommendedLabel}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-line border-line divide-y border-t">
            {narrative.rows.map((row) => {
              const isNet = row.key === "net";
              const isCostRow = row.key === "annual-fee" || row.key === "fx-iof";
              const expandable = isExpandableRow(row);
              const isExpanded = expandable && expandedRows.has(row.key);
              const label = expandable ? (
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => {
                    toggleRow(row.key);
                  }}
                  className="focus-visible:ring-accent hover:[&_span]:text-accent inline-flex cursor-pointer items-center font-normal transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  {row.label}
                  <ToggleDisc open={isExpanded} />
                </button>
              ) : (
                row.label
              );

              return (
                <Fragment key={row.key}>
                  <tr className={isNet ? "border-line-strong border-t-2" : undefined}>
                    <th
                      scope="row"
                      className={cn(
                        "pr-6 text-left",
                        isNet
                          ? "text-ink py-5 align-bottom text-base font-semibold"
                          : "text-ink-muted py-3.5 font-normal",
                      )}
                    >
                      {label}
                      {isCostRow ? (
                        <span className="text-ink-subtle mt-0.5 block text-[0.7rem] italic">
                          custo · menor é melhor
                        </span>
                      ) : null}
                    </th>
                    <ValueCell row={row} side="current" value={row.currentValueBrl} />
                    <ValueCell row={row} side="recommended" value={row.recommendedValueBrl} />
                  </tr>
                  {isNet && narrative.recommendedVerdict !== undefined ? (
                    <tr className="bg-surface-sunken">
                      <td colSpan={3} className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-xs">
                          <Badge tone={VERDICT_PILL_TONE[narrative.recommendedVerdict.kind]}>
                            {narrative.recommendedVerdict.kind === "strong" ? (
                              <Check size={10} aria-hidden />
                            ) : narrative.recommendedVerdict.kind === "negative" ? (
                              <span aria-hidden>✗</span>
                            ) : null}
                            <span>{VERDICT_PILL_LABEL[narrative.recommendedVerdict.kind]}</span>
                          </Badge>
                          <span className="text-ink-subtle" aria-hidden>
                            ·
                          </span>
                          <span
                            className={cn(
                              "tabular font-medium",
                              narrative.verdictBrl >= 0 ? "text-accent" : "text-warning",
                            )}
                          >
                            {narrative.verdictBrl >= 0 ? "+" : ""}
                            {formatBrl(narrative.verdictBrl)}/ano
                          </span>
                        </div>
                        <p className="text-ink-subtle mx-auto mt-1 max-w-md text-xs leading-snug">
                          {narrative.recommendedVerdict.detail}
                        </p>
                      </td>
                    </tr>
                  ) : null}

                  {isExpanded && row.key === "annual-fee" ? <AnnualFeeDetailRow row={row} /> : null}
                  {isExpanded && row.key === "travel-benefit" ? (
                    <BreakdownDetailRows row={row} />
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile layout */}
      <div className="space-y-4 md:hidden">
        <div>
          <p className="text-caption text-ink-subtle">Comparação anual</p>
          {narrative.diagnosis.map((note) => (
            <p key={note} className="text-ink-subtle mt-1 text-xs leading-snug italic">
              {note}
            </p>
          ))}
        </div>

        <div className="divide-line border-line divide-y rounded-lg border">
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="border-line border-r">
                <Badge className="border-line rounded-full border">
                  <p className="text-caption text-ink-subtle">SEU CARTÃO</p>
                </Badge>
                <p className="text-ink mt-0.5 ml-1 text-sm font-semibold">{currentLabel}</p>
              </div>
              <div className="text-right">
                <Badge tone="gold" className="border-line mb-1 ml-auto rounded-full border">
                  <Star size={11} aria-hidden />
                  <span className="text-caption">RECOMENDADO</span>
                </Badge>
                <p className="text-ink mt-0.5 text-sm font-semibold">{recommendedLabel}</p>
              </div>
            </div>
          </div>
          {narrative.rows.map((row) => {
            const isNet = row.key === "net";
            const isCostRow = row.key === "annual-fee" || row.key === "fx-iof";
            const expandable = isExpandableRow(row);

            const currentWinner = isWinningSide(row, "current");
            const recommendedWinner = isWinningSide(row, "recommended");
            const currentNegativeNet = isNet && row.currentValueBrl < 0;
            const recommendedNegativeNet = isNet && row.recommendedValueBrl < 0;

            const currentColor = currentNegativeNet
              ? "text-warning"
              : isNet && currentWinner
                ? "text-accent"
                : !currentWinner && row.tone !== "tie"
                  ? "text-ink-muted"
                  : "text-ink";
            const recommendedColor = recommendedNegativeNet
              ? "text-warning"
              : isNet && recommendedWinner
                ? "text-accent"
                : !recommendedWinner && row.tone !== "tie"
                  ? "text-ink-muted"
                  : "text-ink";
            const currentWeight = isNet
              ? "font-semibold"
              : currentWinner
                ? "font-medium"
                : "font-normal";
            const recommendedWeight = isNet
              ? "font-semibold"
              : recommendedWinner
                ? "font-medium"
                : "font-normal";
            const currentMarked = currentWinner && !currentNegativeNet;
            const recommendedMarked = recommendedWinner && !recommendedNegativeNet;

            const recommendedVerdict = narrative.recommendedVerdict;

            return (
              <Fragment key={row.key}>
                <div
                  className={cn(
                    "px-3 py-3.5",
                    isNet && recommendedVerdict !== undefined && "bg-surface-sunken rounded-b-lg",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={cn(
                        "w-full text-center",
                        isNet ? "text-ink text-xs font-semibold" : "text-ink-muted text-[0.65rem]",
                      )}
                    >
                      {expandable ? (
                        <button
                          type="button"
                          aria-label={`Detalhes: ${row.label}`}
                          onClick={() => {
                            setBreakdownDialogKey(row.key);
                          }}
                          className="focus-visible:ring-accent hover:[&_span]:text-accent inline-flex cursor-pointer items-center gap-1 transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        >
                          {row.label}
                          <Info size={12} className="text-ink-subtle" />
                        </button>
                      ) : (
                        row.label
                      )}
                    </span>
                    {isCostRow ? (
                      <span className="text-ink-subtle text-[0.6rem] italic">menor é melhor</span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-left">
                      <span className="text-ink-subtle text-xs leading-snug">Atual</span>
                      <div
                        className={cn("tabular text-md leading-snug", currentColor, currentWeight)}
                      >
                        {currentMarked ? (
                          <span aria-hidden className="mr-1 inline-block w-2 align-middle">
                            <Check
                              size={isNet ? 9 : 7}
                              className={isNet ? "text-accent" : "text-ink-muted"}
                            />
                          </span>
                        ) : null}
                        {formatBrl(row.currentValueBrl)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-ink-subtle text-xs leading-snug">Recomendado</span>
                      <div
                        className={cn(
                          "tabular text-md leading-snug",
                          recommendedColor,
                          recommendedWeight,
                        )}
                      >
                        <span aria-hidden className="mr-1 inline-block w-2 align-middle">
                          {recommendedMarked ? (
                            <Check
                              size={isNet ? 9 : 7}
                              className={isNet ? "text-accent" : "text-ink-muted"}
                            />
                          ) : null}
                        </span>
                        {formatBrl(row.recommendedValueBrl)}
                      </div>
                    </div>
                  </div>

                  {isNet && recommendedVerdict !== undefined ? (
                    <div className="border-line mt-3 space-y-1.5 border-t pt-2">
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <Badge tone={VERDICT_PILL_TONE[recommendedVerdict.kind]}>
                          {recommendedVerdict.kind === "strong" ? (
                            <Check size={10} aria-hidden />
                          ) : recommendedVerdict.kind === "negative" ? (
                            <span aria-hidden>✗</span>
                          ) : null}
                          <span>{VERDICT_PILL_LABEL[recommendedVerdict.kind]}</span>
                        </Badge>
                        <span className="text-ink-subtle" aria-hidden>
                          ·
                        </span>
                        <span
                          className={cn(
                            "tabular font-medium",
                            narrative.verdictBrl >= 0 ? "text-accent" : "text-warning",
                          )}
                        >
                          {narrative.verdictBrl >= 0 ? "+" : ""}
                          {formatBrl(narrative.verdictBrl)}/ano
                        </span>
                      </div>
                      <p className="text-ink-subtle text-center text-xs leading-snug">
                        {recommendedVerdict.detail}
                      </p>
                    </div>
                  ) : null}
                </div>
              </Fragment>
            );
          })}
        </div>

        {(() => {
          const row =
            breakdownDialogKey !== null
              ? narrative.rows.find((r) => r.key === breakdownDialogKey)
              : null;
          if (row === undefined || row === null) return null;
          return (
            <BreakdownDialog
              open
              title={row.label}
              onClose={() => {
                setBreakdownDialogKey(null);
              }}
            >
              {row.key === "annual-fee" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-[auto_1fr] items-baseline gap-2 text-sm leading-snug">
                    <span className={cn("text-ink-muted", SIDE_WIDTH)}>Atual</span>
                    <span className="text-ink tabular text-right">
                      {feeConditionCell(row.currentFeeDetail)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[auto_1fr] items-baseline gap-2 text-sm leading-snug">
                    <span className={cn("text-ink-muted", SIDE_WIDTH)}>Recomendado</span>
                    <span className="text-ink tabular text-right">
                      {feeConditionCell(row.recommendedFeeDetail)}
                    </span>
                  </div>
                </div>
              ) : null}
              {row.key === "travel-benefit" ? (
                <div className="space-y-4">
                  {mergeBreakdownLabels(row).map((label) => {
                    const current = row.currentBreakdown?.find((p) => p.label === label);
                    const recommended = row.recommendedBreakdown?.find((p) => p.label === label);
                    return (
                      <div key={label}>
                        <p className="text-ink-muted mb-1.5 text-xs font-medium tracking-wide uppercase">
                          {label}
                        </p>
                        <div className="space-y-1">
                          <BreakdownMobileRow side="Atual" part={current} benefitLabel={label} />
                          <BreakdownMobileRow
                            side="Recomendado"
                            part={recommended}
                            benefitLabel={label}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </BreakdownDialog>
          );
        })()}
      </div>

      {preferenceComparison !== undefined ? (
        <PreferencePanel comparison={preferenceComparison} />
      ) : null}

      <div className="border-line/60 border-t pt-5">
        {recommendedBenefits.length > 0 ? (
          <>
            <p className="text-caption text-ink-subtle">Mais no {recommendedLabel}</p>
            <ul className="text-ink-muted marker:text-accent/50 mt-3 list-disc space-y-1.5 pl-5 text-sm leading-snug">
              {recommendedBenefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </>
        ) : null}
        <p
          className={cn(
            "text-ink-subtle text-xs",
            recommendedBenefits.length > 0 ? "mt-5" : undefined,
          )}
        >
          Gasto base: {spendBaseValue(narrative)} · Acesso: {accessLabel}
        </p>
      </div>
    </section>
  );
};
